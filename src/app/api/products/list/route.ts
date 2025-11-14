import { NextResponse } from 'next/server';
import { getAllProductCards, getProductPrices } from '@/lib/db/market-db';
import { AILogger } from '@/lib/ai/core';

export async function GET() {
  try {
    AILogger.info('[products/list] Fetching all products');
    
    // Get all product cards
    const products = getAllProductCards();
    
    // Get prices for each product
    const productsWithPrices = products.map(product => {
      const prices = getProductPrices(product.id);
      
      return {
        ...product,
        priceCount: prices.length,
        minPrice: prices.length > 0 
          ? Math.min(...prices.map(p => p.unit_price))
          : null,
        cheapestMarket: prices.length > 0
          ? prices.sort((a, b) => a.unit_price - b.unit_price)[0].market_name
          : null
      };
    });

    AILogger.info('[products/list] Products fetched', { 
      count: productsWithPrices.length 
    });

    return NextResponse.json({
      success: true,
      products: productsWithPrices,
      total: productsWithPrices.length
    });
    
  } catch (error) {
    AILogger.error('[products/list] Request failed', { error });
    
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
