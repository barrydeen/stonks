import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchLatestExchangeRate, saveExchangeRate, getAllRates } from '@/lib/currency';
import type { Currency } from '@/lib/currency';

// GET /api/exchange-rates - Get current exchange rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = (searchParams.get('base') || 'CAD') as Currency;

    const rates = await getAllRates(baseCurrency);

    return NextResponse.json({ rates, baseCurrency });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

// POST /api/exchange-rates/update - Update exchange rates (for manual refresh or cron)
export async function POST() {
  try {
    const currencies: Currency[] = ['CAD', 'USD'];
    const updatedRates: Array<{ from: Currency; to: Currency; rate: number }> = [];

    // Update all currency pairs
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          try {
            const rate = await fetchLatestExchangeRate(from, to);
            await saveExchangeRate(from, to, rate);
            updatedRates.push({ from, to, rate });
          } catch (error) {
            console.error(`Failed to update ${from}/${to} rate:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Exchange rates updated successfully',
      updatedRates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
} 