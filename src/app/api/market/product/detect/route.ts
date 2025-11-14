import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { normalizeProductV2 } from '@/lib/market/product-normalizer-v2';
import { AILogger } from '@/lib/ai/logger';
import { ProductDetectRequestSchema } from '@/lib/validation/market-v2';
import { validateRequest } from '@/lib/utils/validate';

/**
 * Product Detection API (Standalone 3-Layer Detection)
 * 
 * Fast endpoint for product normalization and categorization
 * No network calls - pure detection logic
 * 
 * POST /api/market/product/detect
 * 
 * @param product - Product name (required)
 * @param includeSKU - Include SKU-level suggestions (optional, default: true)
 * 
 * @returns NormalizedProductV2
 * 
 * **Use Cases:**
 * - Product input validation in forms
 * - Real-time product suggestions
 * - Category/variant extraction
 * - SKU matching without price fetching
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const { product, includeSKU } = await validateRequest(req, ProductDetectRequestSchema);

    AILogger.info('[Product Detect API] Starting detection', {
      product,
      includeSKU
    });

    // ===== 3-LAYER PRODUCT DETECTION =====
    const normalized = await normalizeProductV2(product);

    // Check if detection was successful
    if (!normalized.productKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'detection_failed',
          message: 'Ürün tespit edilemedi',
          data: normalized // Still return partial data
        },
        { status: 400 }
      );
    }

    // Optionally remove SKU suggestions if not requested
    const response = includeSKU 
      ? normalized 
      : {
          ...normalized,
          skuSuggestions: undefined
        };

    AILogger.success('[Product Detect API] Detection completed', {
      product_key: normalized.productKey,
      canonical: normalized.canonical,
      category: normalized.category,
      variant: normalized.variant,
      confidence: normalized.confidence,
      method: normalized.method,
      skuCount: normalized.skuSuggestions?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'validation_error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    AILogger.error('[Product Detect API] Detection error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json(
      {
        success: false,
        error: 'internal_error',
        message,
      },
      { status: 500 }
    );
  }
}
