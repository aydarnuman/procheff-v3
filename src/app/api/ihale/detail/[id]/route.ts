import { AILogger } from '@/lib/ai/logger';
import { parseTenderHTMLWithAI, type TenderSection, type TenderTable } from '@/lib/ai/parse-tender-html';
import { getDB } from '@/lib/db/sqlite-client';
import { ihbDetail, ihbLogin } from '@/lib/ihale/client';
import { sanitizeForSnapshot } from '@/lib/ihale/html-sanitize';
import { normalizeDocuments } from '@/lib/ihale/normalize-documents';
import { rewriteForIframe } from '@/lib/ihale/rewrite-for-iframe';
import { formatParsedData, parseTenderHTML } from '@/lib/utils/html-parser';
import { NextRequest, NextResponse } from 'next/server';

// Increase timeout for AI parsing (screenshot analysis can take time)
export const maxDuration = 90; // 90 seconds

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let sessionId = req.cookies.get('ihale_session')?.value;
  let needsNewSession = !sessionId;

  // If no session, try to login first
  if (!sessionId) {
    try {
      AILogger.info('No session found, attempting login', { tenderId: id });
      sessionId = await ihbLogin();
      needsNewSession = true;
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

    // DEBUG: Check if screenshot came from worker
    let screenshot = (detail as Record<string, unknown>).screenshot;
    const hasScreenshotFromWorker = !!screenshot;
    const screenshotType = screenshot ? typeof screenshot : 'none';
    
    // CRITICAL: Ensure screenshot is a string (base64)
    // Worker sends base64 string, but Express JSON serialization might convert it
    if (hasScreenshotFromWorker && typeof screenshot !== 'string') {
      console.warn('⚠️ [CRITICAL] Screenshot is not a string, attempting conversion...', {
        type: typeof screenshot,
        isArray: Array.isArray(screenshot),
        isBuffer: Buffer.isBuffer(screenshot),
        constructor: screenshot?.constructor?.name,
        keys: typeof screenshot === 'object' && screenshot !== null ? Object.keys(screenshot) : []
      });
      
      // Try to convert to string
      if (Buffer.isBuffer(screenshot)) {
        screenshot = screenshot.toString('base64');
        console.log('✅ Screenshot converted from Buffer to base64 string');
      } else if (screenshot && typeof screenshot === 'object' && screenshot !== null) {
        // If it's an object, it might be a serialization issue
        // Try to extract if it has a 'data' property or similar
        if ('data' in screenshot && typeof (screenshot as any).data === 'string') {
          screenshot = (screenshot as any).data;
          console.log('✅ Screenshot extracted from object.data property');
        } else if ('toString' in screenshot && typeof screenshot.toString === 'function') {
          // Try toString method
          const str = screenshot.toString();
          if (str && str !== '[object Object]') {
            screenshot = str;
            console.log('✅ Screenshot converted using toString()');
          } else {
            console.warn('⚠️ Screenshot object cannot be converted, setting to undefined.');
            screenshot = undefined;
            (detail as any).screenshot = undefined;
          }
        } else {
          console.warn('⚠️ Screenshot is an object without convertible properties, setting to undefined.');
          screenshot = undefined;
          (detail as any).screenshot = undefined;
        }
      } else {
        screenshot = String(screenshot);
        console.log('✅ Screenshot converted to string');
      }
    }
    
    // Update detail with normalized screenshot
    if (screenshot && typeof screenshot === 'string') {
      (detail as any).screenshot = screenshot;
    } else if (hasScreenshotFromWorker) {
      // If we had a screenshot but couldn't convert it, remove it
      (detail as any).screenshot = undefined;
    }
    
    const screenshotLength = screenshot && typeof screenshot === 'string' ? screenshot.length : 0;
    
    AILogger.info('Received detail from worker', {
      tenderId: id,
      hasScreenshot: !!screenshot,
      screenshotType: screenshot ? typeof screenshot : 'none',
      screenshotLength,
      hasHtml: !!detail.html,
      htmlLength: detail.html?.length || 0,
      documentsCount: detail.documents?.length || 0,
      detailKeys: Object.keys(detail)
    });

    // CRITICAL: Normalize documents before processing HTML
    const originalDocuments = detail.documents || [];
    const normalizedDocuments = normalizeDocuments(originalDocuments);
    detail.documents = normalizedDocuments;
    
    // Process HTML in different formats
    if (detail.html) {
      // 1. Raw HTML (original)
      detail.html_raw = detail.html;

      // 2. Rewritten HTML for iframe (pixel-perfect) - DO THIS FIRST for fast rendering
      detail.html_iframe = rewriteForIframe(detail.html);

      // 3. Sanitized HTML for snapshot mode
      detail.html_snapshot = sanitizeForSnapshot(detail.html);

      // 4. AI-powered parsing (structured data) - Use screenshot if available for better AI vision analysis
      const screenshot = (detail as any).screenshot;
      
      AILogger.info('Starting AI parsing', { 
        tenderId: id,
        hasScreenshot: !!screenshot,
        htmlLength: detail.html?.length || 0
      });
      
      // Try AI parsing with timeout (60 seconds max - screenshot analizi uzun sürebilir)
      let aiParsed = null;
      const startTime = Date.now();
      try {
        AILogger.info('Calling parseTenderHTMLWithAI', { 
          tenderId: id,
          hasScreenshot: !!screenshot,
          screenshotLength: screenshot ? screenshot.length : 0,
          htmlLength: detail.html?.length || 0
        });
        
        const aiParsingPromise = parseTenderHTMLWithAI(detail.html, screenshot);
        
        // Set warning timeout (just for logging, doesn't abort)
        const timeoutWarning = setTimeout(() => {
          AILogger.warn('AI parsing taking longer than expected (90s)', { tenderId: id });
        }, 90000); // 90 saniye uyarı
        
        // Hard timeout after 120 seconds (absolute maximum) - abort if not done
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => {
            const elapsedTime = Date.now() - startTime;
            console.error('❌ [ERROR] AI parsing hard timeout reached (120s)', {
              tenderId: id,
              elapsedTime: `${elapsedTime}ms`,
              hasScreenshot: !!screenshot,
              htmlLength: detail.html?.length || 0
            });
            AILogger.error('AI parsing hard timeout reached (120s)', { 
              tenderId: id,
              elapsedTime: `${elapsedTime}ms`,
              hasScreenshot: !!screenshot,
              htmlLength: detail.html?.length || 0
            });
            clearTimeout(timeoutWarning);
            resolve(null);
          }, 120000) // 120 saniye maksimum
        );
        
        try {
          // Race between parsing and timeout - but give parsing a fair chance
          aiParsed = await Promise.race([aiParsingPromise, timeoutPromise]);
          clearTimeout(timeoutWarning);
        } catch (parseError: unknown) {
          clearTimeout(timeoutWarning);
          throw parseError; // Re-throw to be caught by outer catch
        }
        const elapsedTime = Date.now() - startTime;
        
        if (aiParsed) {
          (detail as Record<string, unknown>).ai_parsed = aiParsed;
          (detail as Record<string, unknown>).parsed_sections = aiParsed.sections;
          AILogger.success('AI parsing completed', { 
            tenderId: id,
            elapsedTime: `${elapsedTime}ms`,
            mode: screenshot ? 'screenshot+html' : 'html-only',
            sectionsCount: aiParsed.sections.length,
            tablesCount: aiParsed.tables?.length || 0,
            textContentCount: aiParsed.textContent?.length || 0,
            hasIhaleBilgileri: aiParsed.sections.some((s: TenderSection) => s.category === 'İhale Bilgileri'),
            hasIdareBilgileri: aiParsed.sections.some((s: TenderSection) => s.category === 'İdare Bilgileri'),
            sectionCategories: aiParsed.sections.map((s: TenderSection) => s.category)
          });
        } else {
          const elapsedTime = Date.now() - startTime;
          AILogger.warn('AI parsing returned null', { 
            tenderId: id,
            elapsedTime: `${elapsedTime}ms`,
            likelyTimeout: elapsedTime >= 59000
          });
        }
      } catch (error: unknown) {
        const elapsedTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        
        // Check for authentication errors
        const isAuthError = errorMessage?.includes('authentication') ||
                           errorMessage?.includes('401') ||
                           errorMessage?.includes('invalid x-api-key') ||
                           (error as any)?.name === 'APIError';

        AILogger.error('AI parsing error', {
          error: errorMessage,
          stack: errorStack,
          tenderId: id,
          elapsedTime: `${elapsedTime}ms`,
          isAuthError,
          errorName: (error as any)?.name || 'UnknownError'
        });
        
        // Log critical auth errors separately
        if (isAuthError) {
          console.error('❌ [CRITICAL] Claude API authentication failed!', {
            message: errorMessage,
            apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
            apiKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
            apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) || 'N/A'
          });
        }
      }

      // Fallback to basic parsing if AI parsing failed or timed out
      if (!aiParsed) {
        const parsed = parseTenderHTML(detail.html);
        detail.html_formatted = formatParsedData(parsed);
        detail.parsed_sections = parsed.sections;
      } else {
        // Convert AI parsed data to format expected by formatParsedData
        // AI uses 'category', formatParsedData expects 'title'
        const convertedSections = aiParsed.sections.map((section: TenderSection) => ({
          title: section.category || 'Bölüm',
          items: section.items || []
        }));
        
        // Convert AI tables to ParsedTenderDetail format
        // TenderTable has required title, ParsedTenderDetail.tables has optional title
        const convertedTables = (aiParsed.tables || []).map((table: TenderTable) => ({
          title: table.title || undefined,
          headers: table.headers || [],
          rows: table.rows || []
        }));
        
        // Type assertion: convertedTables matches ParsedTenderDetail.tables structure
        // Using 'as' assertion because tables is optional in ParsedTenderDetail
        detail.html_formatted = formatParsedData({
          sections: convertedSections,
          tables: convertedTables,
          rawText: aiParsed.textContent?.join('\n\n') || ''
        } as Parameters<typeof formatParsedData>[0]);
        detail.parsed_sections = convertedSections;
      }

      // Keep original for backward compatibility
      detail.html = detail.html_formatted || detail.html;
    }
    
    // CRITICAL: Restore normalized documents after HTML processing (they might have been lost)
    if (!detail.documents || detail.documents.length === 0) {
      detail.documents = normalizedDocuments;
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
        // Merge database info with worker detail (preserve documents!)
        (detail as any).tenderNumber = dbInfo.tenderNumber;
        (detail as any).organization = dbInfo.organization;
        (detail as any).city = dbInfo.city;
        (detail as any).tenderType = dbInfo.tenderType;
        (detail as any).publishDate = dbInfo.publishDate;
        (detail as any).tenderDate = dbInfo.tenderDate;
        (detail as any).daysRemaining = dbInfo.daysRemaining;
        (detail as any).partialBidAllowed = Boolean(dbInfo.partialBidAllowed);
        
        // Ensure normalized documents are still present after merge
        if (!detail.documents || detail.documents.length === 0) {
          detail.documents = normalizedDocuments;
        }
      }
    } catch (dbError) {
      // Database not available, continue with worker data only
      console.warn('Could not fetch from database:', dbError);
    }
    
    // Final safety check: ensure normalized documents are always present
    if (!detail.documents || detail.documents.length === 0) {
      detail.documents = normalizedDocuments;
    }
    
    // Log response data before sending
    const hasAiParsed = !!(detail as any).ai_parsed;
    AILogger.info('Sending response', {
      tenderId: id,
      hasAiParsed,
      aiParsedKeys: hasAiParsed ? Object.keys((detail as any).ai_parsed || {}) : [],
      hasHtmlIframe: !!detail.html_iframe,
      documentsCount: detail.documents?.length || 0
    });
    
    // DEBUG: Log full ai_parsed structure if exists
    if (hasAiParsed) {
      const aiData = (detail as any).ai_parsed;
      console.log('🔍 [DEBUG] ai_parsed structure:', {
        hasSections: !!aiData.sections,
        sectionsCount: aiData.sections?.length || 0,
        hasTables: !!aiData.tables,
        tablesCount: aiData.tables?.length || 0,
        hasTextContent: !!aiData.textContent,
        textContentCount: aiData.textContent?.length || 0,
        firstSection: aiData.sections?.[0] ? {
          category: aiData.sections[0].category,
          itemsCount: aiData.sections[0].items?.length || 0
        } : null
      });
    } else {
      console.warn('⚠️ [DEBUG] No ai_parsed in detail object before sending response');
    }
    
    // CRITICAL: Final check - ensure ai_parsed is in response
    const finalCheck = !!(detail as any).ai_parsed;
    if (!finalCheck) {
      console.error('❌ [CRITICAL] ai_parsed is missing from detail object before JSON serialization!');
      console.error('Detail keys:', Object.keys(detail));
    } else {
      console.log('✅ [CRITICAL] ai_parsed confirmed in detail object before JSON serialization');
    }
    
    // Create response with detail data
    const response = NextResponse.json(detail);
    
    // Double-check after JSON serialization (we can't actually check the serialized JSON, but log it)
    console.log('📤 [FINAL] Sending response with ai_parsed:', finalCheck);

    // Always update session cookie to keep it fresh (especially if we just logged in)
    if (sessionId) {
      response.cookies.set('ihale_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 hours (matches worker session duration)
        path: '/',
      });
      if (needsNewSession) {
        AILogger.info('Session cookie set', { tenderId: id, sessionId: sessionId.substring(0, 10) + '...' });
      }
    }

    return response;
  } catch (e: unknown) {
    AILogger.error('Error fetching tender detail', { 
      error: e instanceof Error ? e.message : String(e), 
      tenderId: id 
    });

    // If session expired, try to login again
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (errorMessage.includes('session') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid_session')) {
      try {
        AILogger.info('Session expired, attempting re-login', { tenderId: id, oldSessionId: sessionId?.substring(0, 10) + '...' });
        const newSessionId = await ihbLogin();

        // Retry with new session
        const detail = await ihbDetail(newSessionId, id);

        const response = NextResponse.json(detail);
        response.cookies.set('ihale_session', newSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 8, // 8 hours (matches worker session duration)
          path: '/',
        });

        AILogger.info('Session re-login successful, cookie updated', { tenderId: id, newSessionId: newSessionId.substring(0, 10) + '...' });
        return response;
      } catch (retryError: unknown) {
        AILogger.error('Retry login failed', { 
          error: retryError instanceof Error ? retryError.message : String(retryError), 
          tenderId: id 
        });
        return new Response(JSON.stringify({
          error: 'session_expired',
          message: 'Oturum süresi doldu, lütfen sayfayı yenileyin.'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
