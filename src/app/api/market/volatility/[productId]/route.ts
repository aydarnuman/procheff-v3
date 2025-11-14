import { NextRequest, NextResponse } from 'next/server';
import { volatilityCalculator } from '@/lib/market/analytics/volatility-calculator';
import { AILogger } from '@/lib/ai/logger';

/**
 * Get volatility score for a product
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const params = await context.params;
    const productId = params.productId;
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    AILogger.info('[Volatility API] Calculating volatility', {
      productId,
      days
    });
    
    // Calculate volatility
    const volatilityScore = await volatilityCalculator.calculateVolatility(
      productId,
      days
    );
    
    if (!volatilityScore) {
      return NextResponse.json(
        { error: 'Product not found or insufficient data' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(volatilityScore);
    
  } catch (error) {
    AILogger.error('[Volatility API] Calculation failed', { error });
    return NextResponse.json(
      { error: 'Failed to calculate volatility' },
      { status: 500 }
    );
  }
}

/**
 * Get category volatility summary
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'product', productIds, threshold = 0.5 } = body;
    
    if (type === 'category') {
      // Get category volatility summary
      const categoryVolatility = await volatilityCalculator.getCategoryVolatility();
      return NextResponse.json(categoryVolatility);
    }
    
    if (type === 'alerts') {
      // Get volatility alerts
      const alerts = await volatilityCalculator.getVolatilityAlerts(threshold);
      return NextResponse.json(alerts);
    }
    
    if (type === 'batch' && Array.isArray(productIds)) {
      // Calculate volatility for multiple products
      const results = await Promise.all(
        productIds.map(async (productId: string) => {
          const score = await volatilityCalculator.calculateVolatility(productId);
          return {
            productId,
            score
          };
        })
      );
      
      return NextResponse.json(results);
    }
    
    return NextResponse.json(
      { error: 'Invalid request type' },
      { status: 400 }
    );
    
  } catch (error) {
    AILogger.error('[Volatility API] Request failed', { error });
    return NextResponse.json(
      { error: 'Failed to process volatility request' },
      { status: 500 }
    );
  }
}
