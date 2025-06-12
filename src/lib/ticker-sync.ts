import { prisma } from './db';

// Financial Modeling Prep API configuration
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = process.env.FMP_API_KEY || process.env.ALPHA_VANTAGE_API_KEY || 'demo';

interface FMPStock {
  symbol: string;
  name: string;
  price?: number;
  exchange?: string;
  exchangeShortName?: string;
  type?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
}

interface FMPETf {
  symbol: string;
  name: string;
  price?: number;
  exchange?: string;
  currency?: string;
}

interface FMPCrypto {
  symbol: string;
  name: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  exchange?: string;
  volume?: number;
  avgVolume?: number;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
}

interface FMPCryptoSymbol {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

/**
 * Fetch all stock symbols from Financial Modeling Prep
 */
async function fetchStockSymbols(): Promise<FMPStock[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/stock/list?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching stock symbols:', error);
    return [];
  }
}

/**
 * Fetch all ETF symbols from Financial Modeling Prep
 */
async function fetchETFSymbols(): Promise<FMPETf[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/etf/list?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching ETF symbols:', error);
    return [];
  }
}

/**
 * Fetch actively traded symbols (higher quality list)
 */
async function fetchActiveTradedSymbols(): Promise<FMPStock[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/available-traded/list?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching actively traded symbols:', error);
    return [];
  }
}

/**
 * Fetch symbols from specific exchanges
 */
async function fetchExchangeSymbols(exchange: string): Promise<FMPStock[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/symbol/${exchange}?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching ${exchange} symbols:`, error);
    return [];
  }
}

/**
 * Fetch all cryptocurrency symbols from Financial Modeling Prep
 */
async function fetchCryptoSymbols(): Promise<FMPCryptoSymbol[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/symbol/available-cryptocurrencies?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching crypto symbols:', error);
    return [];
  }
}

/**
 * Fetch all cryptocurrency quotes (with price data) from Financial Modeling Prep
 */
async function fetchCryptoQuotes(): Promise<FMPCrypto[]> {
  try {
    const response = await fetch(`${FMP_BASE_URL}/quotes/crypto?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching crypto quotes:', error);
    return [];
  }
}

/**
 * Transform FMP stock data to our database format
 */
function transformStockToTicker(stock: FMPStock): any {
  return {
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange || stock.exchangeShortName,
    type: stock.type || 'stock',
    currency: stock.currency,
    country: stock.country,
    sector: stock.sector,
    industry: stock.industry,
    marketCap: stock.marketCap ? BigInt(Math.round(stock.marketCap)) : null,
    isActive: true,
    lastUpdated: new Date(),
  };
}

/**
 * Transform FMP ETF data to our database format
 */
function transformETFToTicker(etf: FMPETf): any {
  return {
    symbol: etf.symbol,
    name: etf.name,
    exchange: etf.exchange,
    type: 'etf',
    currency: etf.currency,
    country: null,
    sector: null,
    industry: null,
    marketCap: null,
    isActive: true,
    lastUpdated: new Date(),
  };
}

/**
 * Transform FMP crypto symbol data to our database format
 */
function transformCryptoSymbolToTicker(crypto: FMPCryptoSymbol): any {
  return {
    symbol: crypto.symbol,
    name: crypto.name,
    exchange: crypto.exchangeShortName || crypto.stockExchange,
    type: 'crypto',
    currency: crypto.currency,
    country: null,
    sector: 'Cryptocurrency',
    industry: 'Digital Currency',
    marketCap: null,
    isActive: true,
    lastUpdated: new Date(),
  };
}

/**
 * Transform FMP crypto quote data to our database format
 */
function transformCryptoQuoteToTicker(crypto: FMPCrypto): any {
  return {
    symbol: crypto.symbol,
    name: crypto.name,
    exchange: crypto.exchange,
    type: 'crypto',
    currency: 'USD', // Most crypto quotes are in USD
    country: null,
    sector: 'Cryptocurrency',
    industry: 'Digital Currency',
    marketCap: crypto.marketCap ? BigInt(Math.round(crypto.marketCap)) : null,
    isActive: true,
    lastUpdated: new Date(),
  };
}

/**
 * Sync ticker symbols from Financial Modeling Prep to local database
 */
export async function syncTickerSymbols(): Promise<{
  success: boolean;
  totalFetched: number;
  totalSaved: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  try {
    console.log('Starting ticker symbol synchronization...');

    // Fetch data from multiple sources including crypto
    const [stocks, etfs, activeTraded, cryptoSymbols, cryptoQuotes] = await Promise.all([
      fetchStockSymbols(),
      fetchETFSymbols(),
      fetchActiveTradedSymbols(),
      fetchCryptoSymbols(),
      fetchCryptoQuotes(),
    ]);

    console.log(`Fetched ${stocks.length} stocks, ${etfs.length} ETFs, ${activeTraded.length} active traded, ${cryptoSymbols.length} crypto symbols, ${cryptoQuotes.length} crypto quotes`);

    // Create a map to combine and deduplicate symbols
    const symbolMap = new Map<string, any>();

    // Add stocks
    stocks.forEach(stock => {
      if (stock.symbol && stock.name) {
        symbolMap.set(stock.symbol, transformStockToTicker(stock));
        totalFetched++;
      }
    });

    // Add ETFs
    etfs.forEach(etf => {
      if (etf.symbol && etf.name) {
        symbolMap.set(etf.symbol, transformETFToTicker(etf));
        totalFetched++;
      }
    });

    // Add cryptocurrency symbols
    cryptoSymbols.forEach(crypto => {
      if (crypto.symbol && crypto.name) {
        symbolMap.set(crypto.symbol, transformCryptoSymbolToTicker(crypto));
        totalFetched++;
      }
    });

    // Add cryptocurrency quotes (with market cap data)
    cryptoQuotes.forEach(crypto => {
      if (crypto.symbol && crypto.name) {
        const existing = symbolMap.get(crypto.symbol);
        const transformed = transformCryptoQuoteToTicker(crypto);
        
        if (existing) {
          // Merge with existing data, preferring quote data for market cap
          symbolMap.set(crypto.symbol, {
            ...existing,
            ...transformed,
            marketCap: transformed.marketCap || existing.marketCap,
          });
        } else {
          symbolMap.set(crypto.symbol, transformed);
          totalFetched++;
        }
      }
    });

    // Mark actively traded symbols with better data
    activeTraded.forEach(stock => {
      if (stock.symbol && stock.name) {
        const existing = symbolMap.get(stock.symbol);
        const transformed = transformStockToTicker(stock);
        
        if (existing) {
          // Merge with existing data, preferring active traded data
          symbolMap.set(stock.symbol, {
            ...existing,
            ...transformed,
            isActive: true, // Mark as definitely active
          });
        } else {
          symbolMap.set(stock.symbol, transformed);
          totalFetched++;
        }
      }
    });

    console.log(`Total unique symbols to sync: ${symbolMap.size}`);

    // Batch upsert symbols
    const batchSize = 1000;
    const symbols = Array.from(symbolMap.values());
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      try {
        // Use upsert to handle duplicates
        await Promise.all(
          batch.map(symbol =>
            prisma.tickerSymbol.upsert({
              where: { symbol: symbol.symbol },
              update: {
                name: symbol.name,
                exchange: symbol.exchange,
                type: symbol.type,
                currency: symbol.currency,
                country: symbol.country,
                sector: symbol.sector,
                industry: symbol.industry,
                marketCap: symbol.marketCap,
                isActive: symbol.isActive,
                lastUpdated: symbol.lastUpdated,
              },
              create: symbol,
            })
          )
        );
        
        totalSaved += batch.length;
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}`);
      } catch (error) {
        const errorMsg = `Error saving batch ${i}-${i + batchSize}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Mark symbols not in the latest fetch as potentially inactive
    const symbolsFromAPI = Array.from(symbolMap.keys());
    
    // Process in smaller batches to avoid PostgreSQL bind variable limit
    const updateBatchSize = 5000;
    for (let i = 0; i < symbolsFromAPI.length; i += updateBatchSize) {
      const batch = symbolsFromAPI.slice(i, i + updateBatchSize);
      
      await prisma.tickerSymbol.updateMany({
        where: {
          symbol: {
            notIn: batch,
          },
          lastUpdated: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
          },
        },
        data: {
          isActive: false,
        },
      });
    }

    console.log('Ticker symbol synchronization completed successfully');

    return {
      success: true,
      totalFetched,
      totalSaved,
      errors,
    };
  } catch (error) {
    const errorMsg = `Fatal error during sync: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);

    return {
      success: false,
      totalFetched,
      totalSaved,
      errors,
    };
  }
}

/**
 * Get all ticker symbols from local database
 */
export async function getAllTickerSymbols(options: {
  activeOnly?: boolean;
  type?: string;
  exchange?: string;
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{
  symbols: any[];
  total: number;
}> {
  const {
    activeOnly = true,
    type,
    exchange,
    limit = 1000,
    offset = 0,
    search,
  } = options;

  const where: any = {};

  if (activeOnly) {
    where.isActive = true;
  }

  if (type) {
    where.type = type;
  }

  if (exchange) {
    where.exchange = exchange;
  }

  if (search) {
    where.OR = [
      { symbol: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [symbols, total] = await Promise.all([
    prisma.tickerSymbol.findMany({
      where,
      orderBy: [
        { symbol: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.tickerSymbol.count({ where }),
  ]);

  return { symbols, total };
}

/**
 * Search ticker symbols by name or symbol with better relevance
 */
export async function searchTickerSymbols(query: string, limit = 50): Promise<any[]> {
  const upperQuery = query.toUpperCase();
  
  // First, try to find exact symbol matches
  const exactMatches = await prisma.tickerSymbol.findMany({
    where: {
      isActive: true,
      symbol: {
        equals: upperQuery,
      },
    },
    orderBy: [
      { symbol: 'asc' },
    ],
    take: limit,
  });

  // If we have exact matches, return them first
  if (exactMatches.length > 0) {
    const remainingLimit = limit - exactMatches.length;
    
    if (remainingLimit <= 0) {
      return exactMatches;
    }

    // Get additional partial matches, excluding exact matches
    const partialMatches = await prisma.tickerSymbol.findMany({
      where: {
        isActive: true,
        symbol: {
          not: upperQuery,
        },
        OR: [
          { symbol: { contains: upperQuery, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [
        { symbol: 'asc' },
      ],
      take: remainingLimit,
    });

    return [...exactMatches, ...partialMatches];
  }

  // No exact matches, return partial matches
  return prisma.tickerSymbol.findMany({
    where: {
      isActive: true,
      OR: [
        { symbol: { contains: upperQuery, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      { symbol: 'asc' },
    ],
    take: limit,
  });
} 