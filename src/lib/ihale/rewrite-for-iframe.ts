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

  // 6) Always inject jQuery and Swiper (ihalebul.com uses these libraries)
  // Check if jQuery is already included (more comprehensive check)
  const hasJQueryScript = /jquery[.-]?\d+\.\d+\.\d+[.-]?min?\.js/i.test(rewritten) || 
                          /jquery[.-]?\d+\.\d+\.\d+\.js/i.test(rewritten) ||
                          rewritten.includes('jquery.min.js') ||
                          rewritten.includes('jquery.js');
  const hasSwiperScript = /swiper[.-]?\d+\.\d+\.\d+[.-]?min?\.js/i.test(rewritten) ||
                          rewritten.includes('swiper-bundle.min.js') ||
                          rewritten.includes('swiper.js');
  
  // Check for DataTables usage (more comprehensive)
  const hasDataTable = html.includes('DataTable') || 
                       html.includes('dataTable') || 
                       html.includes('datatable') ||
                       html.includes('.DataTable(') ||
                       html.includes('.dataTable(') ||
                       /new\s+DataTable/i.test(html) ||
                       /\$\([^)]+\)\.DataTable/i.test(html);
  
  const hasDataTableScript = html.includes('datatables.net') || 
                             html.includes('jquery.dataTables') ||
                             rewritten.includes('dataTables.min.js') ||
                             rewritten.includes('dataTables.js');
  
  let jqueryScript = '';
  if (!hasJQueryScript) {
    // Inject jQuery from CDN - MUST load before any scripts that use it
    // Use blocking script (no async/defer) to ensure jQuery loads first
    jqueryScript = `
      <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
      <script>
        // Ensure jQuery is available globally
        if (typeof jQuery === 'undefined') {
          console.error('jQuery failed to load!');
        } else {
          console.log('jQuery loaded successfully:', jQuery.fn.jquery);
        }
      </script>
    `;
  }
  
  let dataTableScript = '';
  if (hasDataTable && !hasDataTableScript) {
    // Inject DataTables if it's used but not loaded
    // Include both CSS and JS, and ensure proper loading order
    dataTableScript = `
      <link rel="stylesheet" href="https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css">
      <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    `;
  }
  
  let swiperScript = '';
  if (!hasSwiperScript) {
    // Inject Swiper from CDN (for carousels/sliders)
    swiperScript = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
      <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    `;
  }
  
  // 6.5) Add initialization script to ensure DataTable works after DOM is ready
  let initScript = '';
  if (hasDataTable) {
    initScript = `
      <script>
        (function() {
          // Wait for both jQuery and DataTables to be available
          function initDataTables() {
            if (typeof jQuery !== 'undefined' && typeof jQuery.fn.dataTable !== 'undefined') {
              // Re-initialize any DataTable calls that might have failed
              try {
                // Find all tables that should be DataTables but aren't initialized
                jQuery('table').each(function() {
                  var $table = jQuery(this);
                  if (!$table.hasClass('dataTable') && !$table.data('dataTable')) {
                    // Check if table has data-table attribute or looks like it should be a DataTable
                    if ($table.attr('data-table') === 'true' || 
                        $table.find('thead').length > 0 && $table.find('tbody tr').length > 0) {
                      try {
                        $table.DataTable({
                          responsive: true,
                          language: {
                            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
                          }
                        });
                      } catch(e) {
                        console.warn('DataTable initialization failed for table:', e);
                      }
                    }
                  }
                });
              } catch(e) {
                console.warn('DataTable auto-init error:', e);
              }
            } else {
              // Retry after a short delay
              setTimeout(initDataTables, 100);
            }
          }
          
          // Try to initialize when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDataTables);
          } else {
            // DOM already loaded, wait a bit for scripts to load
            setTimeout(initDataTables, 500);
          }
          
          // Also try on window load as fallback
          window.addEventListener('load', function() {
            setTimeout(initDataTables, 100);
          });
        })();
      </script>
    `;
  }

  // 7) Inject custom styles for better rendering
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

  // Move all inline scripts to end of body and wrap them to wait for jQuery
  // This ensures jQuery loads before any scripts run
  const inlineScripts: Array<{ attrs: string; content: string }> = [];
  
  // Extract inline scripts (not src-based)
  rewritten = rewritten.replace(
    /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi,
    (match, attrs, scriptContent) => {
      // Skip module scripts and already processed scripts
      if (attrs.includes('type="module"') || 
          attrs.includes('type="text/babel"') ||
          attrs.includes('data-processed="true"')) {
        return match;
      }
      
      // Store script for later injection
      inlineScripts.push({ attrs, content: scriptContent });
      
      // Remove original script (will be re-injected at end)
      return '';
    }
  );
  
  // Create a script loader that waits for jQuery
  let scriptLoader = '';
  if (inlineScripts.length > 0) {
    const needsJQuery = inlineScripts.some(s => 
      s.content.includes('$(') || 
      s.content.includes('jQuery(') || 
      s.content.includes('DataTable') ||
      s.content.includes('.dataTable')
    );
    
    if (needsJQuery) {
      // Wrap all scripts to wait for jQuery
      scriptLoader = `
        <script data-processed="true">
          (function() {
            function runAllScripts() {
              ${inlineScripts.map((script, idx) => `
                try {
                  ${script.content}
                } catch(e${idx}) {
                  console.warn('Script ${idx} execution error:', e${idx});
                }
              `).join('\n')}
            }
            
            // Wait for jQuery
            function waitForJQuery() {
              if (typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined') {
                jQuery(document).ready(runAllScripts);
              } else {
                setTimeout(waitForJQuery, 50);
              }
            }
            
            // Start waiting
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', waitForJQuery);
            } else {
              waitForJQuery();
            }
          })();
        </script>
      `;
    } else {
      // No jQuery needed, run scripts normally
      scriptLoader = inlineScripts.map((script, idx) => `
        <script${script.attrs} data-processed="true">
          try {
            ${script.content}
          } catch(e${idx}) {
            console.warn('Script ${idx} execution error:', e${idx});
          }
        </script>
      `).join('\n');
    }
  }
  
  // Inject jQuery, DataTables, and Swiper first (before other scripts), then styles
  const allScripts = `${jqueryScript}${dataTableScript}${swiperScript}`;
  if (allScripts) {
    // Insert scripts right after <head>
    rewritten = rewritten.replace(
      /(<head[^>]*>)/i,
      `$1${allScripts}`
    );
  }

  // Inject styles
  rewritten = rewritten.replace(
    /<\/head>/i,
    `${customStyles}</head>`
  );
  
  // Inject all scripts (inline scripts + initialization) before </body> or at end of document
  const allEndScripts = `${scriptLoader}${initScript}`;
  if (allEndScripts) {
    if (rewritten.includes('</body>')) {
      rewritten = rewritten.replace('</body>', `${allEndScripts}</body>`);
    } else {
      // If no body tag, append before closing html or at end
      if (rewritten.includes('</html>')) {
        rewritten = rewritten.replace('</html>', `${allEndScripts}</html>`);
      } else {
        rewritten += allEndScripts;
      }
    }
  }

  return rewritten;
}