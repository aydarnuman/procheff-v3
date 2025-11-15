import { initMarketDB } from '@/lib/db/market-db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const success = initMarketDB();
    
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
