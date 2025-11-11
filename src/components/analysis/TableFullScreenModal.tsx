'use client';

import { highlightSearchTerm } from '@/lib/analysis/helpers';
import type { ExtractedTable } from '@/lib/document-processor/types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Search,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface TableFullScreenModalProps {
  table: ExtractedTable;
  onClose: () => void;
}

export function TableFullScreenModal({ table, onClose }: TableFullScreenModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const rowsPerPage = 20;

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm) return table.rows;

    const searchLower = searchTerm.toLowerCase();
    return table.rows.filter(row =>
      row.some(cell => cell?.toString().toLowerCase().includes(searchLower))
    );
  }, [table.rows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (sortColumn === null) return filteredRows;

    const sorted = [...filteredRows].sort((a, b) => {
      const aVal = a[sortColumn]?.toString() || '';
      const bVal = b[sortColumn]?.toString() || '';

      // Try to parse as numbers first
      const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Fall back to string comparison
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal, 'tr')
        : bVal.localeCompare(aVal, 'tr');
    });

    return sorted;
  }, [filteredRows, sortColumn, sortDirection]);

  // Paginate rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedRows.slice(start, end);
  }, [sortedRows, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  // Handle sort
  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  // Handle export
  const handleExport = () => {
    const csvRows = [
      table.headers.join(','),
      ...sortedRows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ];
    const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.title || 'table'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle copy
  const handleCopy = async () => {
    const text = [
      table.headers.join('\t'),
      ...sortedRows.map(row => row.join('\t'))
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Search state - reset page when search term changes  
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-slate-900 rounded-xl flex flex-col ${
            isFullScreen ? 'w-full h-full m-0' : 'w-full max-w-7xl max-h-[90vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {table.title || 'Tablo Görünümü'}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Kaynak: {(table as any).source}
                </span>
                {(table as any).page_number && (
                  <span>Sayfa: {(table as any).page_number}</span>
                )}
                <span>{table.rows.length} satır × {table.headers.length} sütun</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title={isFullScreen ? 'Normal görünüm' : 'Tam ekran'}
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4 text-slate-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Kapat"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-700">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tabloda ara..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-white"
                title="Tabloyu kopyala"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopyala
                  </>
                )}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-white"
                title="CSV olarak indir"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Table container */}
          <div className="flex-1 overflow-auto p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr>
                    {table.headers.map((header, i) => (
                      <th
                        key={i}
                        onClick={() => handleSort(i)}
                        className="px-4 py-3 text-left text-sm font-medium text-slate-300 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {searchTerm ? highlightSearchTerm(header, searchTerm) : header}
                          {sortColumn === i && (
                            <ArrowUpDown className={`w-3 h-3 ${
                              sortDirection === 'asc' ? 'text-blue-400' : 'text-orange-400'
                            }`} />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-4 py-2 text-sm text-slate-300 border-b border-slate-800"
                        >
                          {searchTerm && cell
                            ? highlightSearchTerm(cell.toString(), searchTerm)
                            : cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {paginatedRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={table.headers.length}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Sonuç bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                {sortedRows.length > 0 && (
                  <>
                    {(currentPage - 1) * rowsPerPage + 1}-
                    {Math.min(currentPage * rowsPerPage, sortedRows.length)} / {sortedRows.length} satır
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Önceki sayfa"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>

                <div className="flex items-center gap-1">
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
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Sonraki sayfa"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}