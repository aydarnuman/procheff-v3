import { NextRequest, NextResponse } from 'next/server';
import { extractFromFile } from '@/lib/document-processor/extractor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    // Extract text from file
    const result = await extractFromFile(file, `preview-${Date.now()}`, {
      ocr_enabled: false,
      extract_tables: false,
      extract_dates: false,
      extract_amounts: false,
      extract_entities: false,
      merge_blocks: true,
      clean_text: true,
      detect_language: false
    });

    // Count words
    const wordCount = result.rawText
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0).length;

    return NextResponse.json({
      text: result.rawText,
      wordCount,
      characterCount: result.rawText.length
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

