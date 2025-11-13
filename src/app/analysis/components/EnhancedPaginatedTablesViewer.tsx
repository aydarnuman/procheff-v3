'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Maximize2,
  Bookmark,
  FileText,
  Hash,
  ArrowUpDown,
  Search
} from 'lucide-react';
import type { ExtractedTable } from '@/lib/document-processor/types';
import type { ViewMode } from './EnhancedAnalysisResults';

interface EnhancedPaginatedTablesViewerProps {
  tables: ExtractedTable[];
  searchQuery?: string;
  viewMode?: ViewMode;
  bookmarks?: Set<string>;
  onBookmarkToggle?: (id: string) => void;
  itemsPerPage?: number;
}

type SortConfig = {
  column: number;
  direction: 'asc' | 'desc';
} | null;

export function EnhancedPaginatedTablesViewer({
  tables,
  searchQuery = '',
  viewMode = 'detailed',
  bookmarks = new Set(),
  onBookmarkToggle,
  itemsPerPage = 5
}: EnhancedPaginatedTablesViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [columnFilters, setColumnFilters] = useState<Map<number, string>>(new Map());
  const [fullScreenTable, setFullScreenTable] = useState<string | null>(null);

  // Filter tables based on search
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    
    const query = searchQuery.toLowerCase();
    return tables.filter(table => {
      // Search in headers
      if (table.headers.some(h => h.toLowerCase().includes(query))) return true;
      
      // Search in rows
      if (table.rows.some(row => row.some(cell => cell.toLowerCase().includes(query)))) return true;
      
      // Search in source (doc_id is a string reference like "A:12")
      if (table.doc_id?.toLowerCase().includes(query)) return true;
      
      // Search in title
      if (table.title?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [tables, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTables = filteredTables.slice(startIndex, endIndex);

  const toggleTableExpansion = (tableId: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedTables(newExpanded);
  };

  const handleSort = (tableId: string, columnIndex: number) => {
    setSortConfig(prev => {
      if (prev?.column === columnIndex) {
        return prev.direction === 'asc' 
          ? { column: columnIndex, direction: 'desc' }
          : null;
      }
      return { column: columnIndex, direction: 'asc' };
    });
  };

  const getSortedRows = (rows: string[][], tableId: string) => {
    if (!sortConfig) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.column] || '';
      const bVal = b[sortConfig.column] || '';
      
      // Try to parse as number
      const aNum = parseFloat(aVal.replace(/[^\d.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^\d.-]/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Sort as string
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal, 'tr')
        : bVal.localeCompare(aVal, 'tr');
    });
  };

  const getFilteredRows = (rows: string[][]) => {
    if (columnFilters.size === 0) return rows;
    
    return rows.filter(row => {
      for (const [colIndex, filterValue] of columnFilters) {
        if (!row[colIndex]?.toLowerCase().includes(filterValue.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  };

  const exportTable = (table: ExtractedTable, format: 'csv' | 'excel') => {
    // TODO: Implement export
    console.log('Export table as', format, table);
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <mark key={index} className="bg-yellow-400/30 text-yellow-300">{part}</mark>
        : part
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            {filteredTables.length} tablo
            {searchQuery && ` ("${searchQuery}" için)`}
          </span>
          <span>
            Sayfa {currentPage} / {totalPages}
          </span>
        </div>

        {/* Tables */}
        <div className="space-y-4">
          {currentTables.map((table, index) => {
            const globalIndex = startIndex + index;
            const isExpanded = expandedTables.has(table.table_id);
            const isBookmarked = bookmarks.has(table.table_id);
            const sortedRows = getSortedRows(getFilteredRows(table.rows), table.table_id);
            const displayRows = isExpanded ? sortedRows : sortedRows.slice(0, 5);

            return (
              <motion.div
                key={table.table_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  glass-card p-4 transition-all
                  ${isBookmarked ? 'ring-2 ring-yellow-500/50' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Table className="w-4 h-4 text-green-400" />
                      Tablo {globalIndex + 1}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      {table.doc_id && (
                        <>
                          <FileText className="w-3 h-3" />
                          <span>{highlightText(table.doc_id)}</span>
                          {table.page && (
                            <>
                              <span>•</span>
                              <span>Sayfa {table.page}</span>
                            </>
                          )}
                        </>
                      )}
                      <span>•</span>
                      <span>{table.headers.length} sütun</span>
                      <span>•</span>
                      <span>{table.rows.length} satır</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onBookmarkToggle?.(table.table_id)}
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
                      onClick={() => setFullScreenTable(table.table_id)}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                      title="Tam ekran"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <div className="relative group">
                      <button
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        aria-label="İndirme seçenekleri"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      
                      <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button
                          onClick={() => exportTable(table, 'csv')}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-700 transition-colors text-xs"
                        >
                          CSV olarak
                        </button>
                        <button
                          onClick={() => exportTable(table, 'excel')}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-700 transition-colors text-xs"
                        >
                          Excel olarak
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        {table.headers.map((header, colIndex) => (
                          <th
                            key={colIndex}
                            className="px-3 py-2 text-left font-medium text-slate-300"
                          >
                            <div className="flex items-center gap-2">
                              <span>{highlightText(header)}</span>
                              <button
                                onClick={() => handleSort(table.table_id, colIndex)}
                                className="p-1 hover:bg-slate-700 rounded transition-colors"
                                aria-label={`${header} sütununu sırala`}
                              >
                                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2">
                              {highlightText(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Expand/Collapse */}
                {table.rows.length > 5 && (
                  <button
                    onClick={() => toggleTableExpansion(table.table_id)}
                    className="mt-3 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Daha az göster
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Tümünü göster ({table.rows.length - 5} daha)
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {/* Same pagination component as EnhancedPaginatedTextViewer */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
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
        )}
      </div>

      {/* Full Screen Modal */}
      <AnimatePresence>
        {fullScreenTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setFullScreenTable(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-900 rounded-lg shadow-2xl max-w-6xl max-h-[90vh] overflow-auto w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Render full table here */}
              {tables.find(t => t.table_id === fullScreenTable) && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Tablo Detayı</h2>
                    <button
                      onClick={() => setFullScreenTable(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Full table content */}
                  <div className="overflow-auto">
                    <table className="w-full">
                      {/* ... */}
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
