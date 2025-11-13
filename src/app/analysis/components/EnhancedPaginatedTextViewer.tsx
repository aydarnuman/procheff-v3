'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Bookmark,
  Copy,
  CheckCircle,
  FileText,
  Hash
} from 'lucide-react';
import type { TextBlock } from '@/lib/document-processor/types';

interface EnhancedPaginatedTextViewerProps {
  textBlocks: TextBlock[];
  searchQuery?: string;
  syntaxHighlight?: boolean;
  bookmarks?: Set<string>;
  onBookmarkToggle?: (id: string) => void;
  itemsPerPage?: number;
}

export function EnhancedPaginatedTextViewer({
  textBlocks,
  searchQuery = '',
  syntaxHighlight = true,
  bookmarks = new Set(),
  onBookmarkToggle,
  itemsPerPage = 10
}: EnhancedPaginatedTextViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter blocks based on search
  const filteredBlocks = useMemo(() => {
    if (!searchQuery) return textBlocks;
    
    const query = searchQuery.toLowerCase();
    return textBlocks.filter(block => 
      block.text.toLowerCase().includes(query) ||
      block.source?.toLowerCase().includes(query)
    );
  }, [textBlocks, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredBlocks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBlocks = filteredBlocks.slice(startIndex, endIndex);

  // Highlight text
  const highlightText = useCallback((text: string) => {
    if (!searchQuery || !syntaxHighlight) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? `<mark class="bg-yellow-400/30 text-yellow-300">${part}</mark>`
        : part
    ).join('');
  }, [searchQuery, syntaxHighlight]);

  // Apply syntax highlighting
  const applySyntaxHighlight = useCallback((text: string) => {
    if (!syntaxHighlight) return text;

    // Numbers
    text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-cyan-400">$1</span>');
    
    // Dates (DD.MM.YYYY or DD/MM/YYYY)
    text = text.replace(/\b(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\b/g, '<span class="text-purple-400">$1</span>');
    
    // Money amounts
    text = text.replace(/(\d+(?:[.,]\d+)*)\s*(TL|₺|USD|\$|EUR|€)/gi, '<span class="text-green-400">$1 $2</span>');
    
    // Percentages
    text = text.replace(/(\d+(?:[.,]\d+)?)\s*%/g, '<span class="text-blue-400">$1%</span>');
    
    // Keywords
    const keywords = ['ihale', 'şartname', 'teklif', 'sözleşme', 'madde', 'fiyat', 'bedel'];
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      text = text.replace(regex, '<span class="text-indigo-400 font-medium">$1</span>');
    });

    return text;
  }, [syntaxHighlight]);

  const handleCopy = async (block: TextBlock) => {
    try {
      await navigator.clipboard.writeText(block.text);
      setCopiedId(block.block_id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const processContent = (content: string) => {
    let processed = highlightText(content);
    processed = applySyntaxHighlight(processed);
    return processed;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {filteredBlocks.length} blok
          {searchQuery && ` ("${searchQuery}" için)`}
        </span>
        <span>
          Sayfa {currentPage} / {totalPages}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {currentBlocks.map((block, index) => {
          const globalIndex = startIndex + index;
          const isBookmarked = bookmarks.has(block.block_id);

          return (
            <motion.div
              key={block.block_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                p-4 bg-slate-800/50 rounded-lg border transition-all
                ${isBookmarked ? 'border-yellow-500/50' : 'border-slate-700/50'}
                hover:border-slate-600
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Hash className="w-3 h-3" />
                  <span>Blok {globalIndex + 1}</span>
                  {block.source && (
                    <>
                      <span>•</span>
                      <FileText className="w-3 h-3" />
                      <span>{block.source}</span>
                      {block.page_number && (
                        <>
                          <span>•</span>
                          <span>Sayfa {block.page_number}</span>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onBookmarkToggle?.(block.block_id)}
                    className={`p-1.5 rounded transition-colors ${
                      isBookmarked 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'hover:bg-slate-700 text-slate-400'
                    }`}
                    title="Yer imi"
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => handleCopy(block)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Kopyala"
                  >
                    {copiedId === block.block_id ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
                dangerouslySetInnerHTML={{ __html: processContent(block.text) }}
              />

              {/* Metadata - Removed, not in TextBlock type */}
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="İlk sayfaya git"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1 px-3">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)} aria-label={`Go to page ${pageNum}`}
                  className={`
                    w-8 h-8 rounded-lg transition-all
                    ${currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-800 text-slate-400'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            aria-label="Son sayfaya git"
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
