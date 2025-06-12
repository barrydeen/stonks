import { prisma } from './db';

export type Currency = 'CAD' | 'USD';

export interface ExchangeRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  timestamp: Date;
}

// Free API for exchange rates - exchangerate-api.com
const EXCHANGE_API_BASE = 'https://api.exchangerate-api.com/v4/latest';

export async function fetchLatestExchangeRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  try {
    const response = await fetch(`${EXCHANGE_API_BASE}/${from}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      throw new Error(`Exchange rate for ${from} to ${to} not found`);
    }

    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

export async function getLatestStoredRate(from: Currency, to: Currency): Promise<number | null> {
  if (from === to) return 1;

  try {
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return latestRate?.rate || null;
  } catch (error) {
    console.error('Error getting stored exchange rate:', error);
    return null;
  }
}

export async function saveExchangeRate(from: Currency, to: Currency, rate: number): Promise<void> {
  try {
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: from,
        toCurrency: to,
        rate,
      },
    });
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
}

export async function getExchangeRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  // First try to get the latest stored rate (within the last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  try {
    const recentRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        timestamp: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (recentRate) {
      return recentRate.rate;
    }

    // If no recent rate, fetch from API and store it
    const rate = await fetchLatestExchangeRate(from, to);
    await saveExchangeRate(from, to, rate);
    
    return rate;
  } catch (error) {
    // Fallback to any stored rate if API fails
    const fallbackRate = await getLatestStoredRate(from, to);
    if (fallbackRate) {
      return fallbackRate;
    }
    
    throw error;
  }
}

export async function convertAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

// Utility to get both CAD and USD rates for a base currency
export async function getAllRates(baseCurrency: Currency = 'CAD'): Promise<Record<Currency, number>> {
  if (baseCurrency === 'CAD') {
    return {
      CAD: 1,
      USD: await getExchangeRate('CAD', 'USD'), // How many USD per 1 CAD
    };
  } else {
    return {
      CAD: await getExchangeRate('USD', 'CAD'), // How many CAD per 1 USD
      USD: 1,
    };
  }
}

// Format currency for display
export function formatCurrency(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

// Client-side conversion utility (for use with pre-fetched rates)
export function convertAmountWithRate(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Record<Currency, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // The rates object contains rates relative to the base currency
  // If base is CAD: { CAD: 1, USD: 0.732 } means 1 CAD = 0.732 USD
  // If base is USD: { CAD: 1.37, USD: 1 } means 1 USD = 1.37 CAD
  
  if (fromCurrency === 'CAD' && toCurrency === 'USD') {
    // Converting CAD to USD using rate from CAD base
    return amount * (rates.USD || 1);
  } else if (fromCurrency === 'USD' && toCurrency === 'CAD') {
    // Converting USD to CAD using rate from USD base  
    return amount * (rates.CAD || 1);
  }
  
  return amount;
} 