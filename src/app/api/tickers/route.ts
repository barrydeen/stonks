import { NextRequest, NextResponse } from 'next/server';
import { syncTickerSymbols, getAllTickerSymbols, searchTickerSymbols } from '@/lib/ticker-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const query = searchParams.get('q');
    const type = searchParams.get('type');
    const exchange = searchParams.get('exchange');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Search query required' },
            { status: 400 }
          );
        }
        const searchResults = await searchTickerSymbols(query, limit);
        return NextResponse.json({ symbols: searchResults });

      case 'list':
      default:
        const results = await getAllTickerSymbols({
          type: type || undefined,
          exchange: exchange || undefined,
          limit,
          offset,
          search: query || undefined,
        });
        return NextResponse.json(results);
    }
  } catch (error) {
    console.error('Error in tickers API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'sync') {
      console.log('Starting ticker synchronization...');
      const result = await syncTickerSymbols();
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `Successfully synced ${result.totalSaved} ticker symbols`
          : 'Synchronization failed',
        details: {
          totalFetched: result.totalFetched,
          totalSaved: result.totalSaved,
          errors: result.errors,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error syncing tickers:', error);
    return NextResponse.json(
      { error: 'Failed to sync tickers' },
      { status: 500 }
    );
  }
} 