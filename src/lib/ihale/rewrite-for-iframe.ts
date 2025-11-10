/**
 * URL Rewriter for iframe srcdoc
 * Rewrites all asset URLs to go through our proxy
 */

/**
 * Rewrite HTML content for safe iframe rendering
 * @param html Original HTML from ihalebul.com
 * @returns HTML with rewritten URLs for proxy
 */
export function rewriteForIframe(html: string): string {
  // 1) Add base tag for relative URL resolution
  const injectedBase = html.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="https://www.ihalebul.com/" target="_self">`
  );

  // 2) Rewrite href and src attributes to use our proxy
  let rewritten = injectedBase
    // Handle absolute URLs starting with /
    .replace(
      /(href|src)=["']\/([^"']+)["']/gi,
      (match, attr, path) => {
        const fullUrl = `https://www.ihalebul.com/${path}`;
        const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(fullUrl)}`;
        return `${attr}="${proxyUrl}"`;
      }
    )
    // Handle relative URLs (no leading /)
    .replace(
      /(href|src)=["'](?!http|\/|#|javascript:)([^"']+)["']/gi,
      (match, attr, path) => {
        const fullUrl = `https://www.ihalebul.com/${path}`;
        const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(fullUrl)}`;
        return `${attr}="${proxyUrl}"`;
      }
    )
    // Handle data-src for lazy loading
    .replace(
      /data-src=["']\/([^"']+)["']/gi,
      (match, path) => {
        const fullUrl = `https://www.ihalebul.com/${path}`;
        const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(fullUrl)}`;
        return `data-src="${proxyUrl}"`;
      }
    );

  // 3) Handle srcset for responsive images
  rewritten = rewritten.replace(
    /srcset=["']([^"']+)["']/gi,
    (match, srcsetValue) => {
      const mappedSrcset = srcsetValue
        .split(',')
        .map((item: string) => {
          const [url, descriptor] = item.trim().split(/\s+/);
          let absoluteUrl: string;

          if (url.startsWith('http')) {
            absoluteUrl = url;
          } else if (url.startsWith('/')) {
            absoluteUrl = `https://www.ihalebul.com${url}`;
          } else {
            absoluteUrl = `https://www.ihalebul.com/${url}`;
          }

          const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          return descriptor ? `${proxyUrl} ${descriptor}` : proxyUrl;
        })
        .join(', ');

      return `srcset="${mappedSrcset}"`;
    }
  );

  // 4) Rewrite CSS url() references
  rewritten = rewritten.replace(
    /url\(['"]?(?!data:)([^'")]+)['"]?\)/gi,
    (match, url) => {
      let absoluteUrl: string;

      if (url.startsWith('http')) {
        absoluteUrl = url;
      } else if (url.startsWith('/')) {
        absoluteUrl = `https://www.ihalebul.com${url}`;
      } else {
        absoluteUrl = `https://www.ihalebul.com/${url}`;
      }

      const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return `url('${proxyUrl}')`;
    }
  );

  // 5) Add meta tag to prevent zoom on mobile
  rewritten = rewritten.replace(
    /<head([^>]*)>/i,
    (match) => `${match}<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  );

  // 6) Inject custom styles for better rendering
  const customStyles = `
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      * {
        max-width: 100% !important;
        word-wrap: break-word;
      }
      img {
        height: auto;
      }
      table {
        border-collapse: collapse;
      }
    </style>
  `;

  rewritten = rewritten.replace(
    /<\/head>/i,
    `${customStyles}</head>`
  );

  return rewritten;
}