import { NextRequest, NextResponse } from 'next/server';
import { createPortfolioSnapshot } from '@/lib/asset-pricing';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { getOrFetchCurrentPrice } from '@/lib/asset-pricing';
import { TransactionType } from '@/generated/prisma';
import jwt from 'jsonwebtoken';

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
  isCash?: boolean;
}

// Helper function to calculate live portfolio value in a specific currency
async function calculateLivePortfolioValue(userId: string, targetCurrency: string = 'CAD'): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  // Get exchange rates
  let usdToCadRate = 1.37; // Default fallback
  let cadToUsdRate = 0.73; // Default fallback
  
  try {
    const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/exchange-rates?base=USD`);
    if (ratesResponse.ok) {
      const ratesData = await ratesResponse.json();
      usdToCadRate = ratesData.rates.CAD || 1.37;
    }
    
    const cadRatesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/exchange-rates?base=CAD`);
    if (cadRatesResponse.ok) {
      const cadRatesData = await cadRatesResponse.json();
      cadToUsdRate = cadRatesData.rates.USD || 0.73;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates, using defaults:', error);
  }

  // Calculate holdings from transactions (stocks + cash)
  const holdings: { [key: string]: HoldingData } = {};
  const cashBalances: { [key: string]: number } = {};

  transactions.forEach(transaction => {
    if (transaction.type === 'DEPOSIT' || transaction.type === 'WITHDRAWAL') {
      // Handle cash transactions
      const currency = transaction.currency;
      if (!cashBalances[currency]) {
        cashBalances[currency] = 0;
      }
      
      const amount = parseFloat(transaction.quantity.toString()) * parseFloat(transaction.price.toString());
      
      if (transaction.type === 'DEPOSIT') {
        cashBalances[currency] += amount;
      } else {
        cashBalances[currency] -= amount;
      }
    } else {
      // Handle stock transactions
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

      if (transaction.type === 'BUY') {
        const newTotalCost = holding.totalCost + transactionValue;
        const newQuantity = holding.quantity + parseFloat(transaction.quantity.toString());
        
        holding.avgPrice = newQuantity > 0 ? newTotalCost / newQuantity : 0;
        holding.quantity = newQuantity;
        holding.totalCost = newTotalCost;
      } else if (transaction.type === 'SELL') {
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
        avgPrice: 1,
        currentPrice: 1,
        currency: currency,
        totalValue: balance,
        totalCost: balance,
        gainLoss: 0,
        gainLossPercent: 0,
        isCash: true,
      };
    }
  });

  // Filter out holdings with zero quantity
  const activeHoldings = Object.values(holdings).filter(h => h.quantity > 0);

  // Get current prices for stock holdings
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

  // Update stock holdings with current prices
  stockHoldings.forEach(holding => {
    const currentPriceData = currentPricesMap.get(holding.symbol);
    
    if (currentPriceData) {
      holding.currentPrice = currentPriceData.price;
      holding.totalValue = holding.quantity * holding.currentPrice;
    } else {
      holding.currentPrice = holding.avgPrice;
      holding.totalValue = holding.quantity * holding.avgPrice;
    }
  });

  // Calculate total value with currency conversion
  let totalValue = 0;
  
  activeHoldings.forEach(holding => {
    let convertedValue = holding.totalValue;
    
    // Convert to target currency
    if (holding.currency !== targetCurrency) {
      if (holding.currency === 'USD' && targetCurrency === 'CAD') {
        convertedValue = holding.totalValue * usdToCadRate;
      } else if (holding.currency === 'CAD' && targetCurrency === 'USD') {
        convertedValue = holding.totalValue * cadToUsdRate;
      }
    }
    
    totalValue += convertedValue;
  });

  return totalValue;
}

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const token = getTokenFromRequest(request.headers.get('authorization') || '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Create portfolio snapshot
    await createPortfolioSnapshot(payload.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Portfolio snapshot created'
    });
  } catch (error) {
    console.error('Error creating portfolio snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio snapshot' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const token = getTokenFromRequest(request.headers.get('authorization') || '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    
    // Get user's default currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true }
    });
    
    const userCurrency = user?.defaultCurrency || 'CAD';
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Convert range to days
    const getDaysFromRange = (range: string): number => {
      switch (range) {
        case '7d': return 7;
        case '30d': return 30;
        case '3m': return 90;
        case '6m': return 180;
        case '12m': return 365;
        default: return 30;
      }
    };
    
    const days = getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get historical portfolio snapshots (exclude today)
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { 
        userId,
        date: {
          gte: startDate,
          lt: today // Exclude today's date
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // Create a map of existing snapshots by date
    const snapshotMap = new Map();
    snapshots.forEach((snapshot: any) => {
      const dateKey = snapshot.date.toISOString().split('T')[0];
      snapshotMap.set(dateKey, {
        date: dateKey,
        value: parseFloat(snapshot.totalValue.toString()),
        currency: snapshot.currency
      });
    });
    
    // Get today's live portfolio value in user's currency
    const todayValue = await calculateLivePortfolioValue(userId, userCurrency);
    const todayKey = today.toISOString().split('T')[0];
    
    // Generate all dates in the range and fill missing days with 0
    const chartData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      if (dateKey === todayKey) {
        // Use live value for today - already in user's currency, no conversion needed
        chartData.push({
          date: dateKey,
          value: todayValue,
          currency: userCurrency // Mark with user's currency so frontend doesn't convert
        });
      } else if (snapshotMap.has(dateKey)) {
        chartData.push(snapshotMap.get(dateKey));
      } else {
        chartData.push({
          date: dateKey,
          value: 0,
          currency: userCurrency // Use user's currency for zero values too
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return NextResponse.json({
      success: true,
      data: chartData,
      totalSnapshots: snapshots.length,
      range: range,
      daysInRange: days,
      liveValueForToday: todayValue,
      userCurrency: userCurrency
    });
  } catch (error) {
    console.error('Error fetching portfolio snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio snapshots' },
      { status: 500 }
    );
  }
} 