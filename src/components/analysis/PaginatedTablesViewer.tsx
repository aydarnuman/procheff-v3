'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, BarChart3 } from 'lucide-react';
import type { ExtractedTable } from '@/lib/document-processor/types';

interface PaginatedTablesViewerProps {
  tables: ExtractedTable[];
  tablesPerPage?: number;
  onTableClick?: (index: number, table: ExtractedTable) => void;
}

export function PaginatedTablesViewer({
  tables,
  tablesPerPage = 6,
  onTableClick
}: PaginatedTablesViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(tables.length / tablesPerPage);
  
  const currentTables = useMemo(() => {
    const start = (currentPage - 1) * tablesPerPage;
    const end = start + tablesPerPage;
    return tables.slice(start, end);
  }, [tables, currentPage, tablesPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (tables.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-lg p-6 border border-slate-700/20">
        <div className="text-gray-500 text-center py-8">Tablo bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentTables.map((table, index) => {
          const globalIndex = (currentPage - 1) * tablesPerPage + index;
          return (
            <motion.div
              key={table.table_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/60 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer"
              onClick={() => onTableClick?.(globalIndex, table)}
            >
              {/* Table Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">
                    {table.title || `Tablo ${globalIndex + 1}`}
                  </h4>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTableClick?.(globalIndex, table);
                  }}
                  className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {/* Table Preview */}
              {table.headers && table.headers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-emerald-500/10">
                        {table.headers.slice(0, 3).map((header, idx) => (
                          <th
                            key={idx}
                            className="px-2 py-2 text-left text-emerald-400 font-medium border border-emerald-500/20"
                          >
                            {header}
                          </th>
                        ))}
                        {table.headers.length > 3 && (
                          <th className="px-2 py-2 text-left text-emerald-400 font-medium border border-emerald-500/20">
                            ...
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 3).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-slate-700/30">
                          {row.slice(0, 3).map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-2 py-2 text-gray-300 border border-slate-700/20"
                            >
                              {cell || '-'}
                            </td>
                          ))}
                          {row.length > 3 && (
                            <td className="px-2 py-2 text-gray-500 border border-slate-700/20">
                              ...
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Stats */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-emerald-400">
                  {table.rows.length} satır × {table.headers.length} sütun
                </span>
                {table.page && (
                  <span className="text-slate-500">
                    Sayfa {table.page}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
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
              ({tables.length} tablo)
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

