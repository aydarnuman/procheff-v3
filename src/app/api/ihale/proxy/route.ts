import { NextRequest, NextResponse } from 'next/server';

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

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Validate URL is from ihalebul.com
  try {
    const url = new URL(targetUrl);
    if (!url.hostname.includes('ihalebul.com')) {
      return new Response('Only ihalebul.com resources are allowed', { status: 403 });
    }
  } catch (e) {
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

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Worker proxy failed');
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = response.headers.get('content-disposition') || '';

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (e: any) {
      console.error('Worker proxy error:', e.message);
      // Fall through to direct proxy
    }
  }

  // Direct proxy mode
  try {
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Referer': 'https://www.ihalebul.com/',
    };

    // Add session cookie if available
    if (sessionId) {
      headers['Cookie'] = `ASP.NET_SessionId=${sessionId}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

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
      return new Response(`Proxy failed: ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // For CSS, rewrite URLs
    if (contentType.includes('css')) {
      const text = await response.text();
      const rewrittenCss = rewriteCssUrls(text);
      return new Response(rewrittenCss, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // For text content
    if (contentType.includes('text/') ||
        contentType.includes('javascript') ||
        contentType.includes('json')) {
      const text = await response.text();
      return new Response(text, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
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
    } catch (e) {
      filename = 'document';
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e: any) {
    console.error('Direct proxy error:', e);
    return new Response(`Proxy error: ${e.message}`, { status: 500 });
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
export async function OPTIONS(req: NextRequest) {
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
