import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getPriceHistory } from '@/lib/db/market-db';
import { MarketHistoryDaysSchema } from '@/lib/validation/market-history';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productKey: string }> }
) {
  try {
    const params = await context.params;
    const productKey = decodeURIComponent(params.productKey);
    const { days } = MarketHistoryDaysSchema.parse({
      days: request.nextUrl.searchParams.get('days'),
    });
    
    const history = getPriceHistory(productKey, days);
    
    return NextResponse.json({
      success: true,
      productKey,
      days,
      history,
      count: history.length
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Price history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
