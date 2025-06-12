import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { getOrFetchCurrentPrice } from '@/lib/asset-pricing';
import { TransactionType } from '@/generated/prisma';

interface HoldingData {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: string;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  isCash?: boolean; // Flag to identify cash positions
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request.headers.get('authorization') || '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: payload.userId },
      orderBy: { date: 'asc' },
    });

    // Calculate holdings from transactions (stocks + cash)
    const holdings: { [key: string]: HoldingData } = {};
    const cashBalances: { [key: string]: number } = {}; // Track cash by currency

    transactions.forEach(transaction => {
      if (transaction.type === TransactionType.DEPOSIT || transaction.type === TransactionType.WITHDRAWAL) {
        // Handle cash transactions
        const currency = transaction.currency;
        if (!cashBalances[currency]) {
          cashBalances[currency] = 0;
        }
        
        const amount = parseFloat(transaction.quantity.toString()) * parseFloat(transaction.price.toString());
        
        if (transaction.type === TransactionType.DEPOSIT) {
          cashBalances[currency] += amount;
        } else { // WITHDRAWAL
          cashBalances[currency] -= amount;
        }
      } else {
        // Handle stock transactions (existing logic)
        const key = `${transaction.symbol}-${transaction.currency}`;
        
        if (!holdings[key]) {
          holdings[key] = {
            symbol: transaction.symbol,
            quantity: 0,
            avgPrice: 0,
            currentPrice: 0,
            currency: transaction.currency,
            totalValue: 0,
            totalCost: 0,
            gainLoss: 0,
            gainLossPercent: 0,
            isCash: false,
          };
        }

        const holding = holdings[key];
        const transactionValue = parseFloat(transaction.quantity.toString()) * parseFloat(transaction.price.toString());

        if (transaction.type === TransactionType.BUY) {
          const newTotalCost = holding.totalCost + transactionValue;
          const newQuantity = holding.quantity + parseFloat(transaction.quantity.toString());
          
          holding.avgPrice = newQuantity > 0 ? newTotalCost / newQuantity : 0;
          holding.quantity = newQuantity;
          holding.totalCost = newTotalCost;
        } else if (transaction.type === TransactionType.SELL) {
          const sellCost = parseFloat(transaction.quantity.toString()) * holding.avgPrice;
          
          holding.quantity -= parseFloat(transaction.quantity.toString());
          holding.totalCost -= sellCost;
          
          if (holding.quantity <= 0) {
            holding.quantity = 0;
            holding.totalCost = 0;
            holding.avgPrice = 0;
          }
        }
      }
    });

    // Add cash positions to holdings
    Object.entries(cashBalances).forEach(([currency, balance]) => {
      if (balance > 0) {
        const cashKey = `CASH-${currency}`;
        holdings[cashKey] = {
          symbol: 'CASH',
          quantity: balance,
          avgPrice: 1, // Cash has no price movement
          currentPrice: 1,
          currency: currency,
          totalValue: balance,
          totalCost: balance, // Cash cost basis equals its value
          gainLoss: 0, // Cash doesn't gain/lose value
          gainLossPercent: 0,
          isCash: true,
        };
      }
    });

    // Filter out holdings with zero quantity
    const activeHoldings = Object.values(holdings).filter(h => h.quantity > 0);

    // Get current prices for stock holdings (skip cash)
    const stockHoldings = activeHoldings.filter(h => !h.isCash);
    const symbols = stockHoldings.map(h => h.symbol);
    
    let currentPricesMap = new Map();
    
    if (symbols.length > 0) {
      const currentPricesPromises = symbols.map(async (symbol) => {
        try {
          const price = await getOrFetchCurrentPrice(symbol);
          return { symbol, price };
        } catch (error) {
          console.error(`Failed to get price for ${symbol}:`, error);
          return { symbol, price: null };
        }
      });

      const currentPricesResults = await Promise.all(currentPricesPromises);
      currentPricesMap = new Map(
        currentPricesResults.map(result => [result.symbol, result.price])
      );
    }

    // Update stock holdings with current prices and calculate gains/losses
    stockHoldings.forEach(holding => {
      const currentPriceData = currentPricesMap.get(holding.symbol);
      
      if (currentPriceData) {
        holding.currentPrice = currentPriceData.price;
        holding.totalValue = holding.quantity * holding.currentPrice;
        holding.gainLoss = holding.totalValue - holding.totalCost;
        holding.gainLossPercent = holding.totalCost > 0 ? (holding.gainLoss / holding.totalCost) * 100 : 0;
      } else {
        // Fallback to average price if current price unavailable
        holding.currentPrice = holding.avgPrice;
        holding.totalValue = holding.quantity * holding.avgPrice;
        holding.gainLoss = 0;
        holding.gainLossPercent = 0;
      }
    });

    // Calculate totals (including cash)
    const totalValue = activeHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalCost = activeHoldings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return NextResponse.json({
      holdings: activeHoldings,
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: activeHoldings.length,
      },
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 