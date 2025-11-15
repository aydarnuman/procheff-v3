/**
 * 🚀 BASIT ÇÖZÜM: Direkt İhale Export
 * Sadece ihale ID ver, istediğin formatı al!
 */

import { NextRequest, NextResponse } from 'next/server';
import { ihbLogin, ihbDetail } from '@/lib/ihale/client';
import { 
  extractTXTWithAI, 
  extractCSVWithAI, 
  extractJSONWithAI 
} from '@/lib/ai/export-formats';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ihaleId = searchParams.get('id');
  const format = searchParams.get('format') || 'json';

  if (!ihaleId) {
    return NextResponse.json({ error: 'İhale ID gerekli' }, { status: 400 });
  }

  try {
    // Login to ihalebul.com
    const sessionId = await ihbLogin();
    
    // Get ihale detail
    const detail = await ihbDetail(sessionId, ihaleId);
    
    if (!detail.html) {
      return NextResponse.json({ error: 'İhale bulunamadı' }, { status: 404 });
    }

    let result;
    
    switch (format) {
      case 'csv':
        const tables = await extractCSVWithAI(detail.html);
        result = {
          success: true,
          format: 'csv',
          data: tables,
          count: tables.length,
          ihaleId
        };
        break;
        
      case 'txt':
        const text = await extractTXTWithAI(detail.html);
        result = {
          success: true,
          format: 'txt',
          data: text,
          length: text.length,
          ihaleId
        };
        break;
        
      case 'json':
      default:
        const jsonData = await extractJSONWithAI(detail.html);
        result = {
          success: true,
          format: 'json',
          data: jsonData,
          ihaleId
        };
        break;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Quick export error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Export başarısız',
        ihaleId 
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST: Birden fazla ihale ID'si ile batch export
 */
export async function POST(request: NextRequest) {
  try {
    const { ids, format = 'json' } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'İhale ID listesi gerekli' }, { status: 400 });
    }

    const results = [];
    const sessionId = await ihbLogin();

    for (const ihaleId of ids) {
      try {
        const detail = await ihbDetail(sessionId, ihaleId);
        
        if (!detail.html) {
          results.push({
            ihaleId,
            success: false,
            error: 'İhale bulunamadı'
          });
          continue;
        }

        let data;
        switch (format) {
          case 'csv':
            data = await extractCSVWithAI(detail.html);
            break;
          case 'txt':
            data = await extractTXTWithAI(detail.html);
            break;
          case 'json':
          default:
            data = await extractJSONWithAI(detail.html);
            break;
        }

        results.push({
          ihaleId,
          success: true,
          format,
          data
        });
        
      } catch (error) {
        results.push({
          ihaleId,
          success: false,
          error: error instanceof Error ? error.message : 'Export başarısız'
        });
      }
    }

    return NextResponse.json({
      success: true,
      format,
      results,
      total: ids.length,
      successful: results.filter(r => r.success).length
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch export başarısız' },
      { status: 500 }
    );
  }
}



