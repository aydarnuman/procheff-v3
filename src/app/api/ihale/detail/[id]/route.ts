import { NextRequest, NextResponse } from 'next/server';
import { ihbDetail, ihbLogin } from '@/lib/ihale/client';
import { getDB } from '@/lib/db/sqlite-client';
import { rewriteForIframe } from '@/lib/ihale/rewrite-for-iframe';
import { sanitizeForSnapshot } from '@/lib/ihale/html-sanitize';
import { parseTenderHTML, formatParsedData } from '@/lib/utils/html-parser';
import { parseTenderHTMLWithAI } from '@/lib/ai/parse-tender-html';
import { AILogger } from '@/lib/ai/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let sessionId = req.cookies.get('ihale_session')?.value;

  // If no session, try to login first
  if (!sessionId) {
    try {
      AILogger.info('No session found, attempting login', { tenderId: id });
      sessionId = await ihbLogin();

      // Session ID is now guaranteed to be defined after successful login
    } catch (loginError) {
      AILogger.error('İhalebul.com login failed', { error: loginError, tenderId: id });
      return new Response(JSON.stringify({
        error: 'login_failed',
        message: 'İhalebul.com\'a giriş yapılamadı. Lütfen tekrar deneyin.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  try {
    // Get detail from worker (HTML + documents)
    const detail = await ihbDetail(sessionId!, id);

    // Process HTML in different formats
    if (detail.html) {
      // 1. Raw HTML (original)
      detail.html_raw = detail.html;

      // 2. Rewritten HTML for iframe (pixel-perfect)
      detail.html_iframe = rewriteForIframe(detail.html);

      // 3. Sanitized HTML for snapshot mode
      detail.html_snapshot = sanitizeForSnapshot(detail.html);

      // 4. AI-powered parsing (structured data)
      const aiParsed = await parseTenderHTMLWithAI(detail.html);
      if (aiParsed) {
        detail.ai_parsed = aiParsed;
        detail.parsed_sections = aiParsed.sections;
      } else {
        // Fallback to basic parsing
        const parsed = parseTenderHTML(detail.html);
        detail.html_formatted = formatParsedData(parsed);
        detail.parsed_sections = parsed.sections;
      }

      // Keep original for backward compatibility
      detail.html = detail.html_formatted || detail.html;
    }

    // Try to get additional info from database
    try {
      const db = getDB();
      const stmt = db.prepare(`
        SELECT
          tender_number as tenderNumber,
          organization,
          city,
          tender_type as tenderType,
          publish_date as publishDate,
          tender_date as tenderDate,
          days_remaining as daysRemaining,
          partial_bid_allowed as partialBidAllowed
        FROM tenders
        WHERE id = ?
      `);
      const dbInfo = stmt.get(id) as any;

      if (dbInfo) {
        // Merge database info with worker detail
        (detail as any).tenderNumber = dbInfo.tenderNumber;
        (detail as any).organization = dbInfo.organization;
        (detail as any).city = dbInfo.city;
        (detail as any).tenderType = dbInfo.tenderType;
        (detail as any).publishDate = dbInfo.publishDate;
        (detail as any).tenderDate = dbInfo.tenderDate;
        (detail as any).daysRemaining = dbInfo.daysRemaining;
        (detail as any).partialBidAllowed = Boolean(dbInfo.partialBidAllowed);
      }
    } catch (dbError) {
      // Database not available, continue with worker data only
      console.warn('Could not fetch from database:', dbError);
    }

    // Create response with detail data
    const response = NextResponse.json(detail);

    // Update session cookie if we logged in
    if (!req.cookies.get('ihale_session')?.value && sessionId) {
      response.cookies.set('ihale_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;
  } catch (e: any) {
    AILogger.error('Error fetching tender detail', { error: e.message, tenderId: id });

    // If session expired, try to login again
    if (e.message?.includes('session') || e.message?.includes('unauthorized')) {
      try {
        AILogger.info('Session expired, attempting re-login', { tenderId: id });
        const newSessionId = await ihbLogin();

        // Retry with new session
        const detail = await ihbDetail(newSessionId, id);

        const response = NextResponse.json(detail);
        response.cookies.set('ihale_session', newSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
        });

        return response;
      } catch (retryError: any) {
        AILogger.error('Retry login failed', { error: retryError.message, tenderId: id });
        return new Response(JSON.stringify({
          error: 'session_expired',
          message: 'Oturum süresi doldu, lütfen sayfayı yenileyin.'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
