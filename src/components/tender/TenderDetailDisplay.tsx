'use client';

import { FileText, Info, Calendar, Building2, MapPin, Hash, Clock } from 'lucide-react';

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
}

export function TenderDetailDisplay({ html, fallbackSections }: TenderDetailDisplayProps) {
  if (!html) {
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

  // Check if HTML contains our formatted sections
  const isFormatted = html.includes('grid-cols-1 md:grid-cols-3');

  if (isFormatted) {
    // Already formatted by our parser
    return (
      <div
        className="tender-detail-formatted space-y-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Fallback to raw HTML with styling
  return (
    <div className="tender-html-content">
      <style jsx>{`
        .tender-html-content :global(table) {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 1.5rem 0;
          background: rgba(30, 41, 59, 0.3);
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid rgba(51, 65, 85, 0.5);
        }

        .tender-html-content :global(th) {
          background: linear-gradient(to bottom, rgba(30, 41, 59, 0.9), rgba(30, 41, 59, 0.7));
          color: #e2e8f0;
          font-weight: 600;
          padding: 1rem;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .tender-html-content :global(td) {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
          color: #cbd5e1;
          font-size: 0.875rem;
        }

        .tender-html-content :global(tr:last-child td) {
          border-bottom: none;
        }

        .tender-html-content :global(tbody tr) {
          transition: background-color 0.2s;
        }

        .tender-html-content :global(tbody tr:hover) {
          background: rgba(99, 102, 241, 0.1);
        }

        .tender-html-content :global(td:first-child) {
          font-weight: 500;
          color: #94a3b8;
          width: 35%;
        }

        .tender-html-content :global(p) {
          margin-bottom: 0.75rem;
          color: #cbd5e1;
          line-height: 1.6;
        }

        .tender-html-content :global(strong),
        .tender-html-content :global(b) {
          color: #818cf8;
          font-weight: 600;
        }

        .tender-html-content :global(h1),
        .tender-html-content :global(h2),
        .tender-html-content :global(h3),
        .tender-html-content :global(h4) {
          color: #f1f5f9;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .tender-html-content :global(ul),
        .tender-html-content :global(ol) {
          margin: 1rem 0;
          padding-left: 1.5rem;
          color: #cbd5e1;
        }

        .tender-html-content :global(li) {
          margin-bottom: 0.5rem;
        }

        .tender-html-content :global(a) {
          color: #818cf8;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: all 0.2s;
        }

        .tender-html-content :global(a:hover) {
          color: #a5b4fc;
          border-bottom-color: #a5b4fc;
        }

        /* Special styling for key-value pairs */
        .tender-html-content :global(td:contains(":")) {
          color: #94a3b8;
        }

        /* Hide empty cells */
        .tender-html-content :global(td:empty),
        .tender-html-content :global(td:has-text("-")) {
          opacity: 0.3;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}