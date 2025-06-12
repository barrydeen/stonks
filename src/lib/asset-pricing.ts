import { prisma } from './db';

// Asset types and interfaces
export interface AssetPrice {
  symbol: string;
  price: number;
  currency: 'USD' | 'CAD';
  timestamp: Date;
  source: string;
}

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  currency: string;
}

// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

// Cache to prevent excessive API calls
const priceCache = new Map<string, { price: AssetPrice; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Determine the correct symbol format for Alpha Vantage API
 */
function formatSymbolForAPI(symbol: string): string {
  // TSX symbols need .TO or .TRT suffix for Alpha Vantage
  const tsxSymbols = ['VDY', 'HXQ', 'TDB902', 'VCN', 'VTI.TO'];
  
  if (tsxSymbols.includes(symbol) || symbol.includes('.TO') || symbol.includes('.TRT')) {
    return symbol.includes('.') ? symbol : `${symbol}.TO`;
  }
  
  // US ETFs and stocks use regular symbol
  if (['VOO', 'VTI', 'SPY', 'QQQ', 'AAPL', 'MSFT'].includes(symbol)) {
    return symbol;
  }
  
  // Default: assume it's a US symbol
  return symbol;
}

/**
 * Get current price for a stock/ETF from Alpha Vantage
 */
async function fetchStockPrice(symbol: string): Promise<AssetPrice | null> {
  const formattedSymbol = formatSymbolForAPI(symbol);
  
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${formattedSymbol}&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      console.error(`Alpha Vantage API error for ${symbol}:`, data);
      return null;
    }
    
    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      console.error(`No price data for ${symbol}:`, data);
      return null;
    }
    
    // Determine currency based on symbol
    const currency = formattedSymbol.includes('.TO') || formattedSymbol.includes('.TRT') ? 'CAD' : 'USD';
    
    return {
      symbol: symbol,
      price: parseFloat(quote['05. price']),
      currency,
      timestamp: new Date(),
      source: 'alphavantage'
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get current Bitcoin price from Alpha Vantage
 */
async function fetchBitcoinPrice(): Promise<AssetPrice | null> {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      console.error('Alpha Vantage API error for BTC:', data);
      return null;
    }
    
    const rate = data['Realtime Currency Exchange Rate'];
    if (!rate || !rate['5. Exchange Rate']) {
      console.error('No BTC price data:', data);
      return null;
    }
    
    return {
      symbol: 'BTC',
      price: parseFloat(rate['5. Exchange Rate']),
      currency: 'USD',
      timestamp: new Date(),
      source: 'alphavantage'
    };
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return null;
  }
}

/**
 * Get current price for any asset with caching
 */
export async function getCurrentPrice(symbol: string): Promise<AssetPrice | null> {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.price;
  }
  
  let price: AssetPrice | null = null;
  
  if (symbol === 'BTC') {
    price = await fetchBitcoinPrice();
  } else {
    price = await fetchStockPrice(symbol);
  }
  
  // Cache the result
  if (price) {
    priceCache.set(symbol, { price, timestamp: Date.now() });
    // Also save to database
    await saveAssetPrice(price);
  }
  
  return price;
}

/**
 * Get current prices for multiple assets
 */
export async function getCurrentPrices(symbols: string[]): Promise<Record<string, AssetPrice | null>> {
  const results: Record<string, AssetPrice | null> = {};
  
  // Process in parallel but with rate limiting (Alpha Vantage has 25 requests/day limit)
  const batches = [];
  const batchSize = 5; // Process 5 at a time
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    batches.push(symbols.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    const promises = batch.map(async (symbol) => {
      const price = await getCurrentPrice(symbol);
      return { symbol, price };
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ symbol, price }) => {
      results[symbol] = price;
    });
    
    // Small delay between batches to respect rate limits
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Save asset price to database
 */
export async function saveAssetPrice(assetPrice: AssetPrice): Promise<void> {
  try {
    await prisma.assetPrice.create({
      data: {
        symbol: assetPrice.symbol,
        price: assetPrice.price,
        currency: assetPrice.currency,
        timestamp: assetPrice.timestamp,
        source: assetPrice.source
      }
    });
  } catch (error) {
    console.error('Error saving asset price:', error);
  }
}

/**
 * Get latest stored price for an asset
 */
export async function getLatestStoredPrice(symbol: string): Promise<AssetPrice | null> {
  try {
    const latestPrice = await prisma.assetPrice.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' }
    });
    
    if (!latestPrice) return null;
    
    return {
      symbol: latestPrice.symbol,
      price: parseFloat(latestPrice.price.toString()),
      currency: latestPrice.currency as 'USD' | 'CAD',
      timestamp: latestPrice.timestamp,
      source: latestPrice.source
    };
  } catch (error) {
    console.error('Error getting latest stored price:', error);
    return null;
  }
}

/**
 * Get or fetch current price (tries cache/database first, then API)
 */
export async function getOrFetchCurrentPrice(symbol: string): Promise<AssetPrice | null> {
  // Try cache first
  const cached = priceCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.price;
  }
  
  // Try latest stored price (within 1 hour)
  const stored = await getLatestStoredPrice(symbol);
  if (stored && (Date.now() - stored.timestamp.getTime()) < 60 * 60 * 1000) {
    return stored;
  }
  
  // Fetch fresh price from API
  return await getCurrentPrice(symbol);
}

/**
 * Create daily portfolio snapshot
 */
export async function createPortfolioSnapshot(userId: string): Promise<void> {
  try {
    // Get user's transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { user: true }
    });
    
    if (transactions.length === 0) return;
    
    // Calculate current portfolio value
    const holdings = new Map<string, { quantity: number; symbol: string }>();
    
    // Calculate holdings from transactions
    for (const transaction of transactions) {
      const existing = holdings.get(transaction.symbol) || { quantity: 0, symbol: transaction.symbol };
      
      if (transaction.type === 'BUY') {
        existing.quantity += parseFloat(transaction.quantity.toString());
      } else {
        existing.quantity -= parseFloat(transaction.quantity.toString());
      }
      
      holdings.set(transaction.symbol, existing);
    }
    
    // Get current prices for all holdings
    const symbols = Array.from(holdings.keys());
    const currentPrices = await getCurrentPrices(symbols);
    
    // Calculate total portfolio value in user's default currency
    const user = transactions[0].user;
    const defaultCurrency = user.defaultCurrency;
    let totalValue = 0;
    
    for (const [symbol, holding] of holdings) {
      if (holding.quantity <= 0) continue;
      
      const price = currentPrices[symbol];
      if (!price) continue;
      
      let value = holding.quantity * price.price;
      
      // Convert to user's default currency if needed
      if (price.currency !== defaultCurrency) {
        // Use the currency conversion logic from your existing system
        const { convertAmount } = await import('./currency');
        value = await convertAmount(value, price.currency as any, defaultCurrency as any);
      }
      
      totalValue += value;
    }
    
    // Create snapshot (one per day per user)
    const today = new Date();
    today.setHours(16, 0, 0, 0); // 4 PM market close
    
    await prisma.portfolioSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date: today
        }
      },
      update: {
        totalValue: totalValue,
        currency: defaultCurrency
      },
      create: {
        userId,
        date: today,
        totalValue: totalValue,
        currency: defaultCurrency
      }
    });
    
    console.log(`Portfolio snapshot created for user ${userId}: ${defaultCurrency} ${totalValue.toFixed(2)}`);
  } catch (error) {
    console.error('Error creating portfolio snapshot:', error);
  }
} 