'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Table,
  Search,
  Filter,
  Download,
  Columns,
  Eye,
  Code2,
  Bookmark,
  SplitSquareVertical
} from 'lucide-react';
import type { DataPool } from '@/lib/document-processor/types';
import type { ViewMode } from './EnhancedAnalysisResults';
import { EnhancedPaginatedTextViewer } from './EnhancedPaginatedTextViewer';
import { EnhancedPaginatedTablesViewer } from './EnhancedPaginatedTablesViewer';

interface DataExtractionTabProps {
  dataPool: DataPool;
  viewMode: ViewMode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SubTab = 'raw-data' | 'tables';

export function DataExtractionTab({
  dataPool,
  viewMode,
  searchQuery,
  onSearchChange
}: DataExtractionTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('raw-data');
  const [showSplitView, setShowSplitView] = useState(false);
  const [syntaxHighlight, setSyntaxHighlight] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  // Stats
  const stats = useMemo(() => ({
    totalDocs: dataPool.documents.length,
    totalTables: dataPool.tables.length,
    totalWords: dataPool.metadata?.total_words || 0,
    totalPages: dataPool.metadata?.total_pages || 0,
    extractionTime: dataPool.metadata?.extraction_time_ms || 0
  }), [dataPool]);

  const handleBookmarkToggle = (id: string) => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(id)) {
      newBookmarks.delete(id);
    } else {
      newBookmarks.add(id);
    }
    setBookmarks(newBookmarks);
  };

  const handleExport = (format: 'json' | 'csv' | 'excel') => {
    // TODO: Implement export functionality
    console.log('Export as', format);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Veri Çıkarımı</h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
            <span>{stats.totalDocs} doküman</span>
            <span>•</span>
            <span>{stats.totalTables} tablo</span>
            <span>•</span>
            <span>{stats.totalWords.toLocaleString('tr-TR')} kelime</span>
            <span>•</span>
            <span>{(stats.extractionTime / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSplitView(!showSplitView)}
            className={`p-2 rounded-lg transition-all ${
              showSplitView 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Bölünmüş Görünüm"
          >
            <SplitSquareVertical className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setSyntaxHighlight(!syntaxHighlight)}
            className={`p-2 rounded-lg transition-all ${
              syntaxHighlight 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Sözdizimi Vurgulama"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <div className="relative group">
            <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="text-sm">İndir</span>
            </button>
            
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors text-sm"
              >
                JSON olarak indir
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors text-sm"
              >
                CSV olarak indir
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors text-sm"
              >
                Excel olarak indir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('raw-data')}
          className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
            activeSubTab === 'raw-data'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ham Veri
        </button>
        
        <button
          onClick={() => setActiveSubTab('tables')}
          className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
            activeSubTab === 'tables'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
          Tablolar
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={activeSubTab === 'raw-data' ? 'Ham veride ara...' : 'Tablolarda ara...'}
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      {showSplitView ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Raw Data */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4"
          >
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Ham Veri
            </h3>
            <EnhancedPaginatedTextViewer
              textBlocks={dataPool.textBlocks}
              searchQuery={searchQuery}
              syntaxHighlight={syntaxHighlight}
              bookmarks={bookmarks}
              onBookmarkToggle={handleBookmarkToggle}
            />
          </motion.div>

          {/* Right: Tables */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4"
          >
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Table className="w-4 h-4 text-green-400" />
              Tablolar
            </h3>
            <EnhancedPaginatedTablesViewer
              tables={dataPool.tables}
              searchQuery={searchQuery}
              viewMode={viewMode}
              bookmarks={bookmarks}
              onBookmarkToggle={handleBookmarkToggle}
            />
          </motion.div>
        </div>
      ) : (
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass-card p-6"
        >
          {activeSubTab === 'raw-data' ? (
            <EnhancedPaginatedTextViewer
              textBlocks={dataPool.textBlocks}
              searchQuery={searchQuery}
              syntaxHighlight={syntaxHighlight}
              bookmarks={bookmarks}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ) : (
            <EnhancedPaginatedTablesViewer
              tables={dataPool.tables}
              searchQuery={searchQuery}
              viewMode={viewMode}
              bookmarks={bookmarks}
              onBookmarkToggle={handleBookmarkToggle}
            />
          )}
        </motion.div>
      )}

      {/* Bookmarks Summary */}
      {bookmarks.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-yellow-400" />
            Yer İmleri ({bookmarks.size})
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(bookmarks).map(id => (
              <span
                key={id}
                className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm"
              >
                {id}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
