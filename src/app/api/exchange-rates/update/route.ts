import { NextResponse } from 'next/server';
import { fetchLatestExchangeRate, saveExchangeRate } from '@/lib/currency';
import type { Currency } from '@/lib/currency';

// POST /api/exchange-rates/update - Manually update exchange rates
export async function POST() {
  try {
    const currencies: Currency[] = ['CAD', 'USD'];
    const updatedRates: Array<{ from: Currency; to: Currency; rate: number }> = [];

    // Update all currency pairs
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          try {
            console.log(`Fetching ${from} to ${to} rate...`);
            const rate = await fetchLatestExchangeRate(from, to);
            await saveExchangeRate(from, to, rate);
            updatedRates.push({ from, to, rate });
            console.log(`Updated ${from}/${to}: ${rate}`);
          } catch (error) {
            console.error(`Failed to update ${from}/${to} rate:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange rates updated successfully',
      updatedRates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
} 