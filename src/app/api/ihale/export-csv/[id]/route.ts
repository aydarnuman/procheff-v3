import { NextRequest} from 'next/server';
import { ihbDetail, ihbLogin } from '@/lib/ihale/client';
import { getDatabase } from '@/lib/db/universal-client';
import { generateFilename } from '@/lib/utils/export-csv';
import { tablesToCSV } from '@/lib/utils/format-extractors';
import {
  extractTXTWithAI,
  extractCSVWithAI,
  extractJSONWithAI
} from '@/lib/ai/export-formats';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = (req.nextUrl.searchParams.get('format') || 'csv') as 'txt' | 'csv' | 'json';
  let sessionId = req.cookies.get('ihale_session')?.value;

  // If no session, try to login first
  if (!sessionId) {
    try {
      sessionId = await ihbLogin();
    } catch (_loginError) {
      return new Response('İhalebul.com\'a giriş yapılamadı', { status: 401 });
    }
  }

  try {
    // Get tender title from database
    let tenderTitle = 'İhale';
    let tenderNumber = id;

    try {
      const db = await getDatabase();
      const stmt = db.prepare('SELECT title, tender_number FROM tenders WHERE id = ?');
      const dbInfo = stmt.get(id) as any;
      if (dbInfo) {
        tenderTitle = dbInfo.title;
        tenderNumber = dbInfo.tender_number || id;
      }
    } catch (dbError) {
      console.warn('Could not fetch tender info from database:', dbError);
    }

    // Try to get detail from worker
    const detail = await ihbDetail(sessionId!, id);

    if (!detail.html) {
      return new Response('İhale detayları bulunamadı', { status: 404 });
    }

    // Generate content based on format - using direct HTML extraction, not AI parsing
    let content: string;
    let contentType: string;
    let filename: string;

    try {
      switch (format) {
        case 'txt':
          // Use AI to extract clean TXT format
          try {
            content = await extractTXTWithAI(detail.html);
          } catch (aiError: any) {
            console.error('[Export] AI TXT extraction failed:', aiError.message);
            // Fallback: Use raw HTML text (minimal cleaning)
            content = detail.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          contentType = 'text/plain; charset=utf-8';
          filename = generateFilename(tenderNumber, 'txt', tenderTitle);
          break;

        case 'csv':
          // Use AI to extract clean CSV tables
          let tables: Array<{ title: string; headers: string[]; rows: string[][] }> = [];
          try {
            tables = await extractCSVWithAI(detail.html);
          } catch (aiError: any) {
            console.error('[Export] AI CSV extraction failed:', aiError.message);
            // Fallback: Use AI-parsed tables if available
            if (detail.ai_parsed && detail.ai_parsed.tables && detail.ai_parsed.tables.length > 0) {
              tables = detail.ai_parsed.tables.map((table: any) => ({
                title: table.title || 'Mal/Hizmet Listesi',
                headers: table.headers || [],
                rows: table.rows || []
              }));
            }
          }
          
          const BOM = '\uFEFF'; // Excel UTF-8 compatibility
          content = BOM + tablesToCSV(tables);
          contentType = 'text/csv; charset=utf-8';
          filename = generateFilename(tenderNumber, 'csv', tenderTitle);
          break;

        case 'json':
          // Use AI to extract structured JSON
          let jsonData: any;
          try {
            jsonData = await extractJSONWithAI(detail.html);
            jsonData.exportedAt = new Date().toISOString();
            jsonData.source = 'ai_extraction';
          } catch (aiError: any) {
            console.error('[Export] AI JSON extraction failed:', aiError.message);
            // Fallback: Use API data or basic structure
            if (detail.apiData && typeof detail.apiData === 'object' && Object.keys(detail.apiData).length > 0) {
              jsonData = {
                title: tenderTitle,
                source: 'api',
                apiData: detail.apiData,
                exportedAt: new Date().toISOString()
              };
            } else {
              jsonData = {
                title: tenderTitle,
                source: 'fallback',
                error: 'AI extraction failed',
                exportedAt: new Date().toISOString()
              };
            }
          }
          
          content = JSON.stringify(jsonData, null, 2);
          contentType = 'application/json; charset=utf-8';
          filename = generateFilename(tenderNumber, 'json', tenderTitle);
          break;

        default:
          return new Response('Geçersiz format. Desteklenen: txt, csv, json', { status: 400 });
      }
    } catch (formatError: any) {
      console.error('[Export] Format processing error:', formatError);
      return new Response(`Format işleme hatası: ${formatError.message}`, { status: 500 });
    }

    // Return file
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: any) {
    console.error('[Export] Error:', e.message);
    return new Response(`Export hatası: ${e.message}`, { status: 500 });
  }
}
