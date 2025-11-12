'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatSmartText } from '@/lib/utils/smart-text-formatter';

interface PaginatedTextViewerProps {
  text: string;
  linesPerPage?: number;
}

export function PaginatedTextViewer({ 
  text, 
  linesPerPage = 50 
}: PaginatedTextViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const lines = useMemo(() => text.split('\n'), [text]);
  const totalPages = Math.ceil(lines.length / linesPerPage);
  
  const currentLines = useMemo(() => {
    const start = (currentPage - 1) * linesPerPage;
    const end = start + linesPerPage;
    return lines.slice(start, end).join('\n');
  }, [lines, currentPage, linesPerPage]);

  const formattedText = useMemo(() => formatSmartText(currentLines), [currentLines]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!text) {
    return (
      <div className="bg-slate-900/60 rounded-lg p-6 border border-slate-700/20">
        <div className="text-gray-500 text-center py-8">Veri bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-slate-900/60 rounded-lg p-6 border border-slate-700/20 min-h-[400px]">
        {formattedText}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800/60 rounded-lg p-4 border border-slate-700/30">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all
              ${currentPage === 1
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Önceki</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              Sayfa {currentPage} / {totalPages}
            </span>
            <span className="text-xs text-slate-500">
              ({lines.length} satır)
            </span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all
              ${currentPage === totalPages
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
              }
            `}
          >
            <span>Sonraki</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

