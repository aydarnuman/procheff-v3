'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Download,
  Maximize2,
  ChevronDown,
  ShoppingCart,
  DollarSign,
  Users,
  Settings,
  Search,
  ArrowUpDown,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import type { ExtractedTable } from '@/lib/document-processor/types';
import {
  categorizeAllTables,
  categorizeTable,
  highlightSearchTerm,
  type CategorizedTables
} from '@/lib/analysis/helpers';
import { TableFullScreenModal } from './TableFullScreenModal';

interface TablesViewProps {
  tables: ExtractedTable[];
  searchTerm: string;
}

export function TablesView({ tables, searchTerm }: TablesViewProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['0']));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [copiedTable, setCopiedTable] = useState<string | null>(null);

  // Categorize tables
  const categorizedTables = useMemo(() => {
    return categorizeAllTables(tables);
  }, [tables]);

  // Filter tables by search term
  const filterTablesBySearch = (tablesToFilter: ExtractedTable[]) => {
    if (!searchTerm) return tablesToFilter;
    const searchLower = searchTerm.toLowerCase();

    return tablesToFilter.filter(table => {
      // Search in title
      if (table.title?.toLowerCase().includes(searchLower)) return true;

      // Search in headers
      if (table.headers.some(h => h.toLowerCase().includes(searchLower))) return true;

      // Search in rows (first 10 for performance)
      if (table.rows.slice(0, 10).some(row =>
        row.some(cell => cell?.toString().toLowerCase().includes(searchLower))
      )) return true;

      return false;
    });
  };

  // Toggle table expansion
  const toggleTable = (tableId: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedTables(newExpanded);
  };

  // Handle table export
  const handleExportTable = async (table: ExtractedTable) => {
    // Create CSV content
    const csvRows = [
      table.headers.join(','),
      ...table.rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ];
    const csvContent = csvRows.join('\n');

    // Create blob and download
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

  // Handle table copy
  const handleCopyTable = async (table: ExtractedTable) => {
    const text = [
      table.headers.join('\t'),
      ...table.rows.map(row => row.join('\t'))
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedTable(table.table_id);
    setTimeout(() => setCopiedTable(null), 2000);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'menu':
        return <ShoppingCart className="w-5 h-5" />;
      case 'cost':
        return <DollarSign className="w-5 h-5" />;
      case 'personnel':
        return <Users className="w-5 h-5" />;
      case 'technical':
        return <Settings className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'menu':
        return 'text-green-400 bg-green-500/20';
      case 'cost':
        return 'text-blue-400 bg-blue-500/20';
      case 'personnel':
        return 'text-purple-400 bg-purple-500/20';
      case 'technical':
        return 'text-orange-400 bg-orange-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  // Render table category section
  const renderTableCategory = (
    category: keyof CategorizedTables,
    title: string,
    description: string
  ) => {
    const filteredTables = filterTablesBySearch(categorizedTables[category]);

    if (filteredTables.length === 0) return null;

    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {getCategoryIcon(category)}
              {title} ({filteredTables.length})
            </h3>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
        </div>

        <div className="space-y-3">
          {filteredTables.map((table, index) => (
            <div
              key={table.table_id}
              className="border border-slate-700/50 rounded-lg overflow-hidden"
            >
              {/* Table header */}
              <div
                className="p-4 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleTable(table.table_id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(category)}`}>
                        {category.toUpperCase()}
                      </span>
                      {table.title || `Tablo ${index + 1}`}
                    </h4>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-slate-400">
                        {table.rows.length} satır × {table.headers.length} sütun
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Kaynak: {(table as any).source}
                      </span>
                      {(table as any).page_number && (
                        <span className="text-xs text-slate-400">
                          Sayfa: {(table as any).page_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTable(table);
                      }}
                      className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                      title="Tabloyu kopyala"
                    >
                      {copiedTable === table.table_id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportTable(table);
                      }}
                      className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                      title="CSV olarak indir"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTable(table.table_id);
                      }}
                      className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                      title="Tam ekran görüntüle"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedTables.has(table.table_id) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Table content */}
              {expandedTables.has(table.table_id) && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-800/50">
                          {table.headers.map((header, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 text-left text-sm font-medium text-slate-300 border border-slate-700/50"
                            >
                              {searchTerm ? highlightSearchTerm(header, searchTerm) : header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Show first 20 rows */}
                        {table.rows.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="px-4 py-2 text-sm text-slate-300 border border-slate-700/50"
                              >
                                {searchTerm && cell
                                  ? highlightSearchTerm(cell.toString(), searchTerm)
                                  : cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Show more button */}
                    {table.rows.length > 20 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setSelectedTable(table.table_id)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                        >
                          Tüm {table.rows.length} satırı görüntüle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-green-400" />
            <span className="text-xs text-slate-400">Menü Tabloları</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {categorizedTables.menu.length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-slate-400">Maliyet Tabloları</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {categorizedTables.cost.length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-400">Personel Tabloları</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {categorizedTables.personnel.length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-slate-400">Teknik Tablolar</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {categorizedTables.technical.length}
          </div>
        </motion.div>
      </div>

      {/* Table categories */}
      {renderTableCategory('menu', 'Menü ve Gıda Tabloları', 'Yemek listeleri, malzemeler, porsiyonlar')}
      {renderTableCategory('cost', 'Maliyet ve Fiyat Tabloları', 'Birim fiyatlar, bütçe, ödemeler')}
      {renderTableCategory('personnel', 'Personel ve Operasyon Tabloları', 'Çalışan sayıları, görev dağılımı')}
      {renderTableCategory('technical', 'Teknik ve Ekipman Tabloları', 'Ekipman listesi, teknik özellikler')}
      {renderTableCategory('other', 'Diğer Tablolar', 'Kategorize edilmemiş tablolar')}

      {/* Full screen modal */}
      {selectedTable && (
        <TableFullScreenModal
          table={tables.find(t => t.table_id === selectedTable)!}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {/* Empty state */}
      {tables.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Database className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">Tablo Bulunamadı</h3>
          <p className="text-slate-400">Dokümanlarda henüz tablo tespit edilmedi.</p>
        </div>
      )}
    </div>
  );
}