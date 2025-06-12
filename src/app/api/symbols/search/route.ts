import { NextRequest, NextResponse } from 'next/server';
import { searchTickerSymbols } from '@/lib/ticker-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 1) {
      return NextResponse.json({ symbols: [] });
    }

    // Search for symbols and limit to top 3 results
    const symbols = await searchTickerSymbols(query, 3);
    
    // Transform to include necessary fields for the dropdown and currency detection
    const results = symbols.map(symbol => ({
      symbol: symbol.symbol,
      name: symbol.name,
      type: symbol.type,
      exchange: symbol.exchange,
      currency: symbol.currency,
      country: symbol.country,
    }));

    return NextResponse.json({ symbols: results });
  } catch (error) {
    console.error('Symbol search error:', error);
    return NextResponse.json(
      { error: 'Failed to search symbols' },
      { status: 500 }
    );
  }
} 