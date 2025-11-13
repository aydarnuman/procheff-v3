'use client';

import { FileText, Info, Calendar, Building2, MapPin, Hash, Clock } from 'lucide-react';
import { sanitizeForSnapshot as sanitizeHtml } from '@/lib/ihale/html-sanitize';

interface TenderDetailSection {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

interface TenderDetailDisplayProps {
  html: string | null;
  fallbackSections?: TenderDetailSection[];
  aiParsedData?: {
    sections: TenderDetailSection[];
    summary?: string;
    tables?: Array<{
      title: string;
      headers?: string[];
      rows?: string[][];
    }>;
    textContent?: string[];
  };
}

// Parse HTML tables into structured data
function parseHTMLTables(html: string): TenderDetailSection[] {
  if (typeof window === 'undefined') return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  const sections: TenderDetailSection[] = [];

  tables.forEach((table, tableIndex) => {
    const rows = table.querySelectorAll('tr');
    const items: Array<{ label: string; value: string }> = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const label = cells[0].textContent?.trim() || '';
        const value = cells[1].textContent?.trim() || '';
        if (label && value) {
          items.push({ label, value });
        }
      }
    });

    if (items.length > 0) {
      sections.push({
        title: `Bilgi Grubu ${tableIndex + 1}`,
        items
      });
    }
  });

  return sections;
}

export function TenderDetailDisplay({ html, fallbackSections, aiParsedData }: TenderDetailDisplayProps) {
  if (!html && !aiParsedData) {
    return (
      <div className="p-6 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 text-sm">Detaylı bilgi yükleniyor...</p>
        <p className="text-xs text-slate-500 mt-2">
          İhalebul.com&apos;dan veri çekiliyor
        </p>
      </div>
    );
  }

  // Get appropriate icon for section title
  const getIconForSection = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('tarih') || lowerTitle.includes('süre')) return Calendar;
    if (lowerTitle.includes('kurum') || lowerTitle.includes('idare')) return Building2;
    if (lowerTitle.includes('yer') || lowerTitle.includes('adres')) return MapPin;
    if (lowerTitle.includes('numara') || lowerTitle.includes('no')) return Hash;
    if (lowerTitle.includes('saat') || lowerTitle.includes('zaman')) return Clock;
    return Info;
  };

  // 1. If AI parsed data exists, use it (highest priority)
  if (aiParsedData && (aiParsedData.sections.length > 0 || (aiParsedData as any).tables?.length > 0)) {
    return (
      <div className="space-y-4">
        {aiParsedData.summary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-sm text-indigo-900 leading-relaxed">
              <span className="font-semibold">Özet:</span> {aiParsedData.summary}
            </p>
          </div>
        )}

        {/* Key-Value Sections */}
        {aiParsedData.sections && aiParsedData.sections.map((section, sectionIndex) => {
          const Icon = getIconForSection((section as any).category || section.title);
          const itemCount = section.items.length;

          // Dinamik grid sütunu: az bilgi -> 1-2 sütun, çok bilgi -> 3 sütun
          let gridCols = 'grid-cols-1';
          if (itemCount <= 2) {
            gridCols = 'grid-cols-1';
          } else if (itemCount <= 4) {
            gridCols = 'grid-cols-1 md:grid-cols-2';
          } else if (itemCount <= 9) {
            gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
          } else {
            gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
          }

          return (
            <div key={`section-${sectionIndex}`} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                <Icon className="w-4 h-4 text-indigo-600" />
                {(section as any).category || section.title}
                <span className="text-xs text-slate-400 font-normal ml-auto">
                  {itemCount} alan
                </span>
              </h3>
              <div className={`grid ${gridCols} gap-3`}>
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Tables */}
        {(aiParsedData as any).tables && (aiParsedData as any).tables.map((table: any, tableIndex: number) => {
          const columnCount = table.headers?.length || 0;
          const rowCount = table.rows?.length || 0;

          // Küçük tablolar için compact gösterim
          const isCompact = columnCount <= 2 && rowCount <= 5;

          return (
            <div key={`table-${tableIndex}`} className={`bg-white rounded-xl p-6 shadow-sm border border-slate-200 ${isCompact ? 'max-w-2xl' : ''}`}>
              <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                {table.title}
                <span className="text-xs text-slate-400 font-normal ml-auto">
                  {columnCount} sütun × {rowCount} satır
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className={`w-full ${isCompact ? 'text-sm' : 'text-sm'}`}>
                  {table.headers && table.headers.length > 0 && (
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {table.headers.map((header: any, hIdx: number) => (
                          <th key={hIdx} className="text-left p-3 font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {table.rows && table.rows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="p-3 text-slate-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Text Content */}
        {(aiParsedData as any).textContent && (aiParsedData as any).textContent.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Metin İçerik
              <span className="text-xs text-slate-400 font-normal ml-auto">
                {(aiParsedData as any).textContent.length} paragraf
              </span>
            </h3>
            <div className="space-y-3">
              {(aiParsedData as any).textContent.map((paragraph: any, pIdx: number) => (
                <p key={pIdx} className="text-sm text-slate-700 leading-relaxed p-3 bg-slate-50 rounded-lg border border-slate-100">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Check if HTML contains our formatted sections
  if (html) {
    const isFormatted = html.includes('grid-cols-1 md:grid-cols-3');
    if (isFormatted) {
      return (
        <div
          className="tender-detail-formatted space-y-6"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      );
    }

    // 3. Try to parse HTML tables into structured format
    const parsedSections = parseHTMLTables(html);
    if (parsedSections.length > 0) {
      return (
        <div className="space-y-4">
          {parsedSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // Fallback to raw HTML with styling
  return (
    <div className="tender-html-content">
      <style jsx>{`
        .tender-html-content :global(table) {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1.5rem 0 !important;
          background: #ffffff !important;
          border-radius: 12px !important;
          overflow: hidden;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .tender-html-content :global(thead) {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9) !important;
        }

        .tender-html-content :global(th) {
          background: transparent !important;
          color: #1e293b !important;
          font-weight: 600;
          padding: 1rem 1.25rem !important;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .tender-html-content :global(th:first-child) {
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }

        .tender-html-content :global(th:last-child) {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        .tender-html-content :global(tbody tr) {
          transition: all 0.2s;
          background: #ffffff;
        }

        .tender-html-content :global(tbody tr:nth-child(even)) {
          background: #f8fafc !important;
        }

        .tender-html-content :global(tbody tr:hover) {
          background: #f1f5f9 !important;
        }

        .tender-html-content :global(td) {
          padding: 0.875rem 1.25rem !important;
          border-bottom: 1px solid #f1f5f9 !important;
          color: #334155 !important;
          font-size: 0.875rem;
        }

        .tender-html-content :global(tbody tr:last-child td) {
          border-bottom: none !important;
        }

        .tender-html-content :global(td:first-child) {
          font-weight: 600;
          color: #64748b !important;
          width: 30%;
          font-size: 0.8125rem;
        }

        .tender-html-content :global(td:last-child) {
          color: #0f172a !important;
          font-weight: 500;
        }

        .tender-html-content :global(p) {
          margin-bottom: 0.5rem;
          color: #334155;
          line-height: 1.7;
        }

        /* Key-value pairs styling */
        .tender-html-content :global(p:has(strong)),
        .tender-html-content :global(p:has(b)) {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
        }

        .tender-html-content :global(p:has(strong):hover),
        .tender-html-content :global(p:has(b):hover) {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateX(4px);
        }

        .tender-html-content :global(strong),
        .tender-html-content :global(b) {
          color: #64748b;
          font-weight: 600;
          min-width: 180px;
          flex-shrink: 0;
          font-size: 0.875rem;
        }

        .tender-html-content :global(strong::after),
        .tender-html-content :global(b::after) {
          content: ':';
          margin-left: 0.25rem;
          color: #94a3b8;
        }

        .tender-html-content :global(h1),
        .tender-html-content :global(h2),
        .tender-html-content :global(h3),
        .tender-html-content :global(h4) {
          color: #0f172a;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .tender-html-content :global(h2) {
          font-size: 1.25rem;
        }

        .tender-html-content :global(h3) {
          font-size: 1.125rem;
        }

        .tender-html-content :global(ul),
        .tender-html-content :global(ol) {
          margin: 1rem 0;
          padding-left: 1.5rem;
          color: #334155;
        }

        .tender-html-content :global(li) {
          margin-bottom: 0.625rem;
          padding-left: 0.5rem;
          position: relative;
        }

        .tender-html-content :global(li::marker) {
          color: #6366f1;
        }

        .tender-html-content :global(a) {
          color: #6366f1;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
          font-weight: 500;
        }

        .tender-html-content :global(a:hover) {
          color: #4f46e5;
        }

        .tender-html-content :global(a::after) {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 1px;
          background: #6366f1;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .tender-html-content :global(a:hover::after) {
          opacity: 1;
        }

        /* Dividers */
        .tender-html-content :global(hr) {
          border: none;
          height: 1px;
          background: #e2e8f0;
          margin: 2rem 0;
        }

        /* Blockquotes */
        .tender-html-content :global(blockquote) {
          border-left: 3px solid #6366f1;
          padding-left: 1rem;
          margin: 1rem 0;
          background: #f8fafc;
          border-radius: 0 8px 8px 0;
          padding: 1rem;
          color: #334155;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(html || '')) }} />
    </div>
  );
}