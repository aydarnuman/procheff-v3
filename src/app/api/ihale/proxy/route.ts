import { NextRequest, NextResponse } from 'next/server';
import { AILogger } from '@/lib/ai/logger';

/**
 * Proxy endpoint for ihalebul.com assets
 * Can work in two modes:
 * 1. Direct proxy - fetches resources directly from ihalebul.com
 * 2. Worker proxy - uses the ihale-worker service
 */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('ihale_session')?.value;
  const targetUrl = req.nextUrl.searchParams.get('url');
  const useWorker = req.nextUrl.searchParams.get('worker') === 'true';
  const inline = req.nextUrl.searchParams.get('inline') === 'true'; // For ZIP extraction, don't trigger download

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Validate URL is from ihalebul.com
  try {
    const url = new URL(targetUrl);
    if (!url.hostname.includes('ihalebul.com')) {
      return new Response('Only ihalebul.com resources are allowed', { status: 403 });
    }
  } catch (error) {
    return new Response('Invalid URL', { status: 400 });
  }

  // If worker mode is requested and available, use it
  if (useWorker && process.env.IHALE_WORKER_URL) {
    if (!sessionId) {
      return new Response('Unauthorized - session required for worker proxy', { status: 401 });
    }

    try {
      const workerUrl = process.env.IHALE_WORKER_URL;
      const proxyUrl = `${workerUrl}/proxy?sessionId=${sessionId}&url=${encodeURIComponent(targetUrl)}`;

      // Add timeout for worker proxy request (90 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(proxyUrl, { signal: controller.signal }).finally(() => {
        clearTimeout(timeoutId);
      });

      if (!response.ok) {
        throw new Error(`Worker proxy failed: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      let contentDisposition = response.headers.get('content-disposition') || '';

      // If inline=true, override Content-Disposition to prevent download
      if (inline && contentDisposition.includes('attachment')) {
        contentDisposition = contentDisposition.replace('attachment', 'inline');
      }

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition || (inline ? 'inline' : 'attachment'),
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : undefined;
      AILogger.warn('Worker proxy failed, using direct proxy', {
        error: errorMessage,
        url: targetUrl,
        stack: errorStack,
      });
      // Fall through to direct proxy
    }
  }

  // Direct proxy mode
  try {
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Referer': 'https://www.ihalebul.com/',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    // Add session cookie if available
    if (sessionId) {
      headers['Cookie'] = `ASP.NET_SessionId=${sessionId}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (büyük dosyalar için)

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        AILogger.error('Proxy request timeout', { url: targetUrl });
        return new Response('Request timeout', { status: 504 });
      }
      throw fetchError;
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const redirectUrl = location.startsWith('http')
          ? location
          : `https://www.ihalebul.com${location.startsWith('/') ? '' : '/'}${location}`;

        const proxyRedirect = `/api/ihale/proxy?url=${encodeURIComponent(redirectUrl)}`;
        return NextResponse.redirect(new URL(proxyRedirect, req.url));
      }
    }

    if (!response.ok) {
      AILogger.warn('Proxy request failed', {
        url: targetUrl,
        status: response.status,
        statusText: response.statusText,
      });
      return new Response(`Proxy failed: ${response.statusText}`, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // For CSS, rewrite URLs with better error handling and CORB prevention
    if (contentType.includes('css') || targetUrl.includes('.css')) {
      try {
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          AILogger.warn('Empty CSS content', { url: targetUrl });
          // Return minimal CSS to prevent errors
          return new Response('/* Empty CSS */', {
            headers: {
              'Content-Type': 'text/css; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
              'X-Content-Type-Options': 'nosniff',
              'Cross-Origin-Resource-Policy': 'cross-origin',
            },
          });
        }
        const rewrittenCss = rewriteCssUrls(text);
        return new Response(rewrittenCss, {
          headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Content-Type-Options': 'nosniff',
            'Cross-Origin-Resource-Policy': 'cross-origin',
          },
        });
      } catch (cssError: unknown) {
        const errorMessage = cssError instanceof Error ? cssError.message : String(cssError);
        AILogger.error('CSS processing error', {
          url: targetUrl,
          error: errorMessage,
        });
        // Return minimal CSS to prevent breaking the page
        return new Response('/* CSS load error */', {
          headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Content-Type-Options': 'nosniff',
            'Cross-Origin-Resource-Policy': 'cross-origin',
          },
        });
      }
    }

    // For text content (including JavaScript)
    if (contentType.includes('text/') ||
        contentType.includes('javascript') ||
        contentType.includes('json')) {
      const text = await response.text();
      const finalContentType = contentType.includes('javascript')
        ? 'application/javascript; charset=utf-8'
        : contentType.includes('json')
        ? 'application/json; charset=utf-8'
        : contentType.includes('text/')
        ? `${contentType}; charset=utf-8`
        : contentType;
      
      return new Response(text, {
        headers: {
          'Content-Type': finalContentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // For binary content (likely a document download)
    const buffer = await response.arrayBuffer();

    // Extract filename from URL hash parameter
    let filename = 'document';
    try {
      const url = new URL(targetUrl);
      const hash = url.searchParams.get('hash');

      if (hash) {
        // Decode base64 hash (e.g., ekap://2025/2025.1745912.idari.zip)
        const decoded = Buffer.from(hash, 'base64').toString('utf-8');
        const filenameMatch = decoded.match(/([^/]+\.(pdf|docx?|xlsx?|txt|zip|rar))$/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        // Fallback: try to get from URL path
        const pathParts = url.pathname.split('/');
        filename = pathParts[pathParts.length - 1] || 'document';
      }
    } catch (error) {
      filename = 'document';
    }

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          // Use inline for ZIP extraction to prevent automatic download
          'Content-Disposition': inline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Content-Type-Options': 'nosniff',
        },
      });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    AILogger.error('Direct proxy error', {
      error: errorMessage,
      url: targetUrl,
      stack: errorStack,
    });
    
    // For CSS files, return empty CSS instead of error to prevent page breakage
    if (targetUrl.includes('.css')) {
      return new Response('/* Proxy error - CSS not loaded */', {
        status: 200, // Return 200 to prevent browser error
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Content-Type-Options': 'nosniff',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    }
    
    return new Response(`Proxy error: ${errorMessage}`, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Rewrite URLs in CSS to use our proxy
 */
function rewriteCssUrls(css: string): string {
  return css.replace(
    /url\((['"]?)(?!data:)([^'")]+)\1\)/gi,
    (match, quote, url) => {
      if (url.startsWith('data:') || url.includes('/api/ihale/proxy')) {
        return match;
      }

      let absoluteUrl = url;
      if (!url.startsWith('http')) {
        if (url.startsWith('//')) {
          absoluteUrl = 'https:' + url;
        } else if (url.startsWith('/')) {
          absoluteUrl = `https://www.ihalebul.com${url}`;
        } else {
          absoluteUrl = `https://www.ihalebul.com/${url}`;
        }
      }

      const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return `url(${quote}${proxyUrl}${quote})`;
    }
  );
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(_req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
