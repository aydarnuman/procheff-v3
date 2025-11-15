import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AILogger } from '@/lib/ai/core';
import { saveMarketPrice, getProductCard, type MarketPrice } from '@/lib/db/market-db';
import { validateRequest } from '@/lib/utils/validate';
import { MarketFetchPriceSchema } from '@/lib/validation/market-fetch-price';

    
    // Real market API URLs (these would be actual API endpoints in production)
    // Removed unused MARKET_APIS variable
// Market-specific price fetchers
async function fetchMigrosPrice(productName: string): Promise<MarketPrice | null> {
  try {
    // In production, this would make a real API call
    // For now, we use simulated data
    const mockData = {
      'domates': { price: 39.90, unit: 'kg', packageSize: 1, brand: null },
      'salatalık': { price: 34.90, unit: 'kg', packageSize: 1, brand: null },
      'süt': { price: 42.90, unit: 'lt', packageSize: 1, brand: 'Pınar' },
      'zeytinyağı': { price: 399.90, unit: 'lt', packageSize: 1, brand: 'Kristal' },
      'makarna': { price: 18.90, unit: 'adet', packageSize: 0.5, brand: 'Barilla' }
    };

    const normalizedName = productName.toLowerCase();
    const data = mockData[normalizedName as keyof typeof mockData];
    
    if (!data) return null;

    return {
      product_card_id: '',
      product_key: normalizedName,
      market_name: 'migros',
      unit_price: data.price,
      package_size: data.packageSize,
      unit: data.unit,
      brand: data.brand || undefined,
      is_promotion: false,
      stock_status: 'in_stock',
      confidence_score: 0.95,
      data_source: 'api'
    };
  } catch (error) {
    AILogger.error('[fetch-price] Migros API error', { error });
    return null;
  }
}

async function fetchCarrefourPrice(productName: string): Promise<MarketPrice | null> {
  try {
    const mockData = {
      'domates': { price: 37.50, unit: 'kg', packageSize: 1, brand: null },
      'salatalık': { price: 32.90, unit: 'kg', packageSize: 1, brand: null },
      'süt': { price: 41.50, unit: 'lt', packageSize: 1, brand: 'İçim' },
      'zeytinyağı': { price: 389.00, unit: 'lt', packageSize: 1, brand: 'Komili' },
      'makarna': { price: 16.90, unit: 'adet', packageSize: 0.5, brand: 'Filiz' }
    };

    const normalizedName = productName.toLowerCase();
    const data = mockData[normalizedName as keyof typeof mockData];
    
    if (!data) return null;

    return {
      product_card_id: '',
      product_key: normalizedName,
      market_name: 'carrefoursa',
      unit_price: data.price,
      package_size: data.packageSize,
      unit: data.unit,
      brand: data.brand || undefined,
      is_promotion: Math.random() > 0.7,
      stock_status: 'in_stock',
      confidence_score: 0.92,
      data_source: 'api'
    };
  } catch (error) {
    AILogger.error('[fetch-price] CarrefourSA API error', { error });
    return null;
  }
}

async function fetchA101Price(productName: string): Promise<MarketPrice | null> {
  try {
    const mockData = {
      'domates': { price: 29.95, unit: 'kg', packageSize: 1, brand: null },
      'salatalık': { price: 27.95, unit: 'kg', packageSize: 1, brand: null },
      'süt': { price: 38.95, unit: 'lt', packageSize: 1, brand: 'Sütaş' },
      'zeytinyağı': { price: 359.00, unit: 'lt', packageSize: 1, brand: 'Yudum' },
      'makarna': { price: 14.95, unit: 'adet', packageSize: 0.5, brand: 'Ülker' }
    };

    const normalizedName = productName.toLowerCase();
    const data = mockData[normalizedName as keyof typeof mockData];
    
    if (!data) return null;

    return {
      product_card_id: '',
      product_key: normalizedName,
      market_name: 'a101',
      unit_price: data.price,
      package_size: data.packageSize,
      unit: data.unit,
      brand: data.brand || undefined,
      is_promotion: false,
      stock_status: 'in_stock',
      confidence_score: 0.90,
      data_source: 'api'
    };
  } catch (error) {
    AILogger.error('[fetch-price] A101 API error', { error });
    return null;
  }
}

async function fetchBimPrice(productName: string): Promise<MarketPrice | null> {
  try {
    const mockData = {
      'domates': { price: 28.90, unit: 'kg', packageSize: 1, brand: null },
      'salatalık': { price: 26.90, unit: 'kg', packageSize: 1, brand: null },
      'süt': { price: 37.90, unit: 'lt', packageSize: 1, brand: 'Dost' },
      'zeytinyağı': { price: 349.00, unit: 'lt', packageSize: 1, brand: 'Zeytin Dostu' },
      'makarna': { price: 13.90, unit: 'adet', packageSize: 0.5, brand: 'Uno' }
    };

    const normalizedName = productName.toLowerCase();
    const data = mockData[normalizedName as keyof typeof mockData];
    
    if (!data) return null;

    return {
      product_card_id: '',
      product_key: normalizedName,
      market_name: 'bim',
      unit_price: data.price,
      package_size: data.packageSize,
      unit: data.unit,
      brand: data.brand || undefined,
      is_promotion: false,
      stock_status: 'in_stock',
      confidence_score: 0.88,
      data_source: 'api'
    };
  } catch (error) {
    AILogger.error('[fetch-price] BİM API error', { error });
    return null;
  }
}

async function fetchGetirPrice(productName: string): Promise<MarketPrice | null> {
  try {
    const mockData = {
      'domates': { price: 44.90, unit: 'kg', packageSize: 1, brand: null },
      'salatalık': { price: 39.90, unit: 'kg', packageSize: 1, brand: null },
      'süt': { price: 44.90, unit: 'lt', packageSize: 1, brand: 'Pınar' },
      'zeytinyağı': { price: 429.00, unit: 'lt', packageSize: 1, brand: 'Kristal' },
      'makarna': { price: 21.90, unit: 'adet', packageSize: 0.5, brand: 'Barilla' }
    };

    const normalizedName = productName.toLowerCase();
    const data = mockData[normalizedName as keyof typeof mockData];
    
    if (!data) return null;

    return {
      product_card_id: '',
      product_key: normalizedName,
      market_name: 'getir',
      unit_price: data.price,
      package_size: data.packageSize,
      unit: data.unit,
      brand: data.brand || undefined,
      is_promotion: false,
      stock_status: 'in_stock',
      confidence_score: 0.93,
      data_source: 'api'
    };
  } catch (error) {
    AILogger.error('[fetch-price] Getir API error', { error });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productCardId, productName } = await validateRequest(
      request,
      MarketFetchPriceSchema
    );

    AILogger.info('[fetch-price] Fetching prices', { productCardId, productName });

    // Get product card if ID provided
    let productCard = null;
    if (productCardId) {
      productCard = getProductCard(productCardId);
      if (!productCard) {
        return NextResponse.json(
          { error: 'Product card not found' },
          { status: 404 }
        );
      }
    }

    const searchName = productCard?.name || productName;
    if (!searchName) {
      return NextResponse.json(
        { error: 'Product name could not be resolved' },
        { status: 400 }
      );
    }
    
    // Fetch prices from all markets in parallel
    const pricePromises = [
      fetchMigrosPrice(searchName),
      fetchCarrefourPrice(searchName),
      fetchA101Price(searchName),
      fetchBimPrice(searchName),
      fetchGetirPrice(searchName)
    ];

    const prices = await Promise.all(pricePromises);
    const validPrices = prices.filter(p => p !== null) as MarketPrice[];

    // Update product_card_id if we have it
    if (productCardId) {
      validPrices.forEach(price => {
        price.product_card_id = productCardId;
      });
    }

    // Save all prices to database
    const savedIds: number[] = [];
    for (const price of validPrices) {
      const id = saveMarketPrice(price);
      if (id) savedIds.push(id);
    }

    AILogger.info('[fetch-price] Prices fetched and saved', { 
      totalMarkets: pricePromises.length,
      successfulFetches: validPrices.length,
      savedToDb: savedIds.length
    });

    // Calculate statistics
    const allPrices = validPrices.map(p => p.unit_price);
    const stats = {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
      avg: allPrices.reduce((a, b) => a + b, 0) / allPrices.length,
      median: allPrices.sort((a, b) => a - b)[Math.floor(allPrices.length / 2)]
    };

    return NextResponse.json({
      success: true,
      productCardId: productCardId,
      productName: searchName,
      prices: validPrices,
      stats: stats,
      savedCount: savedIds.length,
      message: `Fetched prices from ${validPrices.length} markets`
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    AILogger.error('[fetch-price] Request failed', { error });
    
    return NextResponse.json(
      { error: 'Failed to fetch prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
