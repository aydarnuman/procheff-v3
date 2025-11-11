import { NextRequest, NextResponse } from 'next/server';
import { ihbDetail, ihbLogin } from '@/lib/ihale/client';
import { getDB } from '@/lib/db/sqlite-client';
import { parseTenderHTMLWithAI } from '@/lib/ai/parse-tender-html';
import { convertToTXT, convertTablesToCSV, convertToJSON, generateFilename } from '@/lib/utils/export-csv';

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
    } catch (loginError) {
      return new Response('İhalebul.com\'a giriş yapılamadı', { status: 401 });
    }
  }

  try {
    // Get tender title from database
    let tenderTitle = 'İhale';
    let tenderNumber = id;

    try {
      const db = getDB();
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

    // Parse HTML with AI
    const aiParsed = await parseTenderHTMLWithAI(detail.html);

    if (!aiParsed) {
      return new Response('İhale verileri parse edilemedi', { status: 500 });
    }

    // Generate content based on format
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'txt':
        content = convertToTXT(aiParsed, tenderTitle);
        contentType = 'text/plain; charset=utf-8';
        filename = generateFilename(tenderNumber, 'txt', tenderTitle);
        break;

      case 'csv':
        const BOM = '\uFEFF'; // Excel UTF-8 compatibility
        content = BOM + convertTablesToCSV(aiParsed, tenderTitle);
        contentType = 'text/csv; charset=utf-8';
        filename = generateFilename(tenderNumber, 'csv', tenderTitle);
        break;

      case 'json':
        content = convertToJSON(aiParsed, tenderTitle);
        contentType = 'application/json; charset=utf-8';
        filename = generateFilename(tenderNumber, 'json', tenderTitle);
        break;

      default:
        return new Response('Geçersiz format. Desteklenen: txt, csv, json', { status: 400 });
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
