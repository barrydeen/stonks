import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPrice, getCurrentPrices, getLatestStoredPrice } from '@/lib/asset-pricing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const symbols = searchParams.get('symbols');
    
    if (symbol) {
      // Get price for single asset
      const price = await getCurrentPrice(symbol.toUpperCase());
      
      if (!price) {
        return NextResponse.json(
          { error: `Price not found for ${symbol}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(price);
    }
    
    if (symbols) {
      // Get prices for multiple assets
      const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
      const prices = await getCurrentPrices(symbolArray);
      
      return NextResponse.json(prices);
    }
    
    return NextResponse.json(
      { error: 'Missing symbol or symbols parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json();
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Invalid symbols array' },
        { status: 400 }
      );
    }
    
    const symbolArray = symbols.map(s => s.toUpperCase());
    const prices = await getCurrentPrices(symbolArray);
    
    return NextResponse.json({
      success: true,
      prices,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { error: 'Failed to update prices' },
      { status: 500 }
    );
  }
} 