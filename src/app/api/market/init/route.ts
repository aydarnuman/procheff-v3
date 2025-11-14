import { NextResponse } from 'next/server';
import { initMarketTables } from '@/lib/db/market-db';

export async function POST() {
  try {
    const success = initMarketTables();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Market tables initialized successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to initialize market tables' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Market init error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
