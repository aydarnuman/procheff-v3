/**
 * HTML Sanitizer for snapshot mode
 * Provides safe HTML rendering while preserving essential styling
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Configure DOMPurify with custom allowed tags and attributes
 */
const configureSnapshot = () => {
  // Allow these tags for structure
  const ALLOWED_TAGS = [
    'div', 'span', 'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'strong', 'b', 'em', 'i', 'u',
    'a', 'img',
    'section', 'article', 'header', 'footer', 'main', 'nav',
    'blockquote', 'pre', 'code',
    'dl', 'dt', 'dd',
    'figure', 'figcaption'
  ];

  // Allow these attributes for styling and functionality
  const ALLOWED_ATTR = [
    'class', 'id', 'style',
    'href', 'src', 'alt', 'title',
    'width', 'height',
    'colspan', 'rowspan',
    'data-*', // Allow data attributes
    'aria-*', // Allow accessibility attributes
    'role'
  ];

  // Allow inline styles but sanitize dangerous properties
  const ALLOWED_STYLE_PROPS = [
    'color', 'background-color', 'background',
    'font-size', 'font-weight', 'font-family',
    'text-align', 'text-decoration',
    'margin', 'margin-*', 'padding', 'padding-*',
    'border', 'border-*',
    'width', 'height', 'max-width', 'min-width',
    'display', 'flex', 'flex-*', 'grid', 'grid-*',
    'position', 'top', 'bottom', 'left', 'right',
    'opacity', 'visibility',
    'overflow', 'overflow-*',
    'white-space', 'word-wrap', 'word-break'
  ];

  return {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_STYLE_PROPS
  };
};

/**
 * Sanitize HTML for safe snapshot rendering
 * @param html Raw HTML from ihalebul.com
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeForSnapshot(html: string): string {
  const config = configureSnapshot();

  // Configure DOMPurify
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: config.ALLOWED_TAGS,
    ALLOWED_ATTR: config.ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true,
    KEEP_CONTENT: true,
    ADD_TAGS: ['style'], // Allow style tags
    ADD_ATTR: ['target'], // Allow target for links
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
  });

  // Post-process to ensure Turkish characters are preserved
  let processed = clean
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&uuml;/g, 'ü')
    .replace(/&#286;/g, 'Ğ')
    .replace(/&#287;/g, 'ğ')
    .replace(/&#304;/g, 'İ')
    .replace(/&#305;/g, 'ı')
    .replace(/&#350;/g, 'Ş')
    .replace(/&#351;/g, 'ş');

  // Inject snapshot-specific styles for better appearance
  const snapshotStyles = `
    <style>
      /* Snapshot mode styles */
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #e2e8f0;
        background: transparent;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 8px;
        overflow: hidden;
      }

      th {
        background: rgba(51, 65, 85, 0.8);
        color: #f1f5f9;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        border-bottom: 1px solid rgba(71, 85, 105, 0.5);
      }

      td {
        padding: 12px;
        border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        color: #cbd5e1;
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr:hover {
        background: rgba(99, 102, 241, 0.05);
      }

      a {
        color: #818cf8;
        text-decoration: none;
        transition: color 0.2s;
      }

      a:hover {
        color: #a5b4fc;
        text-decoration: underline;
      }

      h1, h2, h3, h4, h5, h6 {
        color: #f1f5f9;
        margin: 16px 0 8px 0;
        font-weight: 600;
      }

      h1 { font-size: 1.875rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; }
      h4 { font-size: 1.125rem; }

      strong, b {
        color: #a5b4fc;
        font-weight: 600;
      }

      .section-header {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0 10px 0;
        border-left: 4px solid #818cf8;
      }

      .info-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(71, 85, 105, 0.2);
      }

      .info-label {
        color: #94a3b8;
        font-weight: 500;
      }

      .info-value {
        color: #e2e8f0;
      }

      /* Hide empty elements */
      :empty:not(br) {
        display: none;
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        .info-row {
          grid-template-columns: 1fr;
          gap: 4px;
        }

        table {
          font-size: 0.875rem;
        }

        th, td {
          padding: 8px;
        }
      }
    </style>
  `;

  // Add styles to the beginning of the content
  processed = snapshotStyles + processed;

  // Additional post-processing for better structure
  processed = processed
    // Add classes to tables for styling
    .replace(/<table>/gi, '<table class="tender-table">')
    // Add classes to headers for styling
    .replace(/<h([1-6])>/gi, '<h$1 class="section-header">')
    // Ensure links open in new tab
    .replace(/<a\s+href=/gi, '<a target="_blank" rel="noopener noreferrer" href=');

  return processed;
}

/**
 * Extract text-only content for search/analysis
 * @param html Raw HTML
 * @returns Plain text content
 */
export function extractTextContent(html: string): string {
  // Remove all tags for text extraction
  const textOnly = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });

  // Clean up whitespace and normalize
  return textOnly
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Check if HTML content is safe without sanitization
 * @param html HTML to check
 * @returns true if HTML contains no dangerous content
 */
export function isHtmlSafe(html: string): boolean {
  const dangerous = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
    /<link/i,
    /<meta[^>]*http-equiv/i,
    /data:text\/html/i
  ];

  return !dangerous.some(pattern => pattern.test(html));
}