import { NextRequest, NextResponse } from 'next/server';
import { runDailyScheduler, scheduleDailySnapshots } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'daily-snapshots') {
      // Force run daily snapshots regardless of time/day
      await scheduleDailySnapshots();
      
      return NextResponse.json({
        success: true,
        message: 'Daily portfolio snapshots generated successfully'
      });
    }
    
    if (action === 'run-scheduler') {
      // Run the scheduler with time/day checks
      await runDailyScheduler();
      
      return NextResponse.json({
        success: true,
        message: 'Scheduler executed successfully'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "daily-snapshots" or "run-scheduler"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Scheduler API error:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduler' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Scheduler API is running',
      endpoints: {
        'POST /api/scheduler': {
          actions: ['daily-snapshots', 'run-scheduler'],
          description: 'Run scheduler actions'
        },
        'GET /api/prices': 'Get current asset prices',
        'POST /api/prices': 'Update asset prices',
        'GET /api/portfolio/snapshot': 'Get portfolio snapshots',
        'POST /api/portfolio/snapshot': 'Create portfolio snapshot'
      }
    });
  } catch (error) {
    console.error('Scheduler status error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
} 