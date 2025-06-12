import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { searchTickerSymbols } from '@/lib/ticker-sync';

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
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request.headers.get('authorization') || '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { symbol, type, quantity, price, currency, date } = await request.json();

    if (!symbol || !type || !quantity || !price || !currency) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate symbol against ticker database (skip validation for cash transactions)
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol !== 'CASH') {
      try {
        const validSymbol = await prisma.tickerSymbol.findFirst({
          where: {
            symbol: upperSymbol,
            isActive: true,
          },
        });

        if (!validSymbol) {
          return NextResponse.json(
            { error: `Invalid symbol: ${upperSymbol}. Please select a valid symbol from the dropdown.` },
            { status: 400 }
          );
        }
      } catch (symbolError) {
        console.error('Symbol validation error:', symbolError);
        // Continue without validation if ticker database is unavailable
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: payload.userId,
        symbol: upperSymbol,
        type,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        currency,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 