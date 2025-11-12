/**
 * API Route: /api/ai/classify-document
 *
 * Secure server-side document classification using Gemini AI.
 * This prevents exposing API keys to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiDocumentClassifier } from '@/lib/ai/gemini-document-classifier';
import { AILogger } from '@/lib/ai/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClassifyRequest {
  fileName: string;
  textSample: string;
  fileExtension?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClassifyRequest = await request.json();

    const { fileName, textSample, fileExtension } = body;

    // Validate input
    if (!fileName || !textSample) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, textSample' },
        { status: 400 }
      );
    }

    AILogger.info('Document classification request received', {
      fileName,
      textLength: textSample.length,
      fileExtension,
    });

    // Call Gemini classifier (server-side with secure API key)
    const result = await GeminiDocumentClassifier.classify({
      fileName,
      textSample,
      fileExtension: fileExtension || fileName.split('.').pop() || 'unknown'
    });

    if (!result) {
      AILogger.warn('Gemini classification returned null', { fileName });
      return NextResponse.json(
        { error: 'Classification failed', result: null },
        { status: 200 } // Still return 200 so client can fallback
      );
    }

    AILogger.success('Document classified successfully', {
      fileName,
      documentType: result.documentType,
      confidence: result.confidence,
    });

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    AILogger.error('Document classification API error', {
      error: error?.message || String(error),
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
