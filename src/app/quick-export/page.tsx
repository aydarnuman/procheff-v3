'use client';

import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
}

export default function QuickExportPage() {
  const [ihaleId, setIhaleId] = useState('1762377106337');
  const [format, setFormat] = useState<'csv' | 'txt' | 'json'>('csv');
  const [loading, setLoading] = useState(false);

  interface ExportResult {
    success: boolean;
    data: TableData[] | string | Record<string, unknown>;
    error?: string;
    format?: string;
    count?: number;
    length?: number;
    ihaleId?: string;
  }

  const [result, setResult] = useState<ExportResult | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/ihale/quick-export?id=${ihaleId}&format=${format}`);
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        
        // Auto download
        if (format === 'csv' && Array.isArray(data.data) && data.data.length > 0) {
          const csv = (data.data as TableData[]).map((table) => 
            [table.title, ...table.headers.join(','), ...table.rows.map((row) => row.join(','))].join('\n')
          ).join('\n\n');
          
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ihale_${ihaleId}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
        
        if (format === 'txt' && typeof data.data === 'string') {
          const blob = new Blob([data.data], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ihale_${ihaleId}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
        
        if (format === 'json') {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ihale_${ihaleId}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
        
      } else {
        alert('Export başarısız: ' + data.error);
      }
    } catch (error) {
      alert('Hata: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          🚀 Hızlı İhale Export
        </h1>
        
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
          {/* İhale ID */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              İhale ID
            </label>
            <input
              type="text"
              value={ihaleId}
              onChange={(e) => setIhaleId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="1762377106337"
            />
          </div>
          
          {/* Format Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Export Formatı
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-lg border transition-all ${
                  format === 'csv' 
                    ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-xs font-medium text-emerald-300">CSV</div>
                <div className="text-xs text-emerald-500/70">Tablolar</div>
              </button>
              
              <button
                onClick={() => setFormat('txt')}
                className={`p-4 rounded-lg border transition-all ${
                  format === 'txt' 
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50'
                }`}
              >
                <FileText className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-xs font-medium text-blue-300">TXT</div>
                <div className="text-xs text-blue-500/70">Düz metin</div>
              </button>
              
              <button
                onClick={() => setFormat('json')}
                className={`p-4 rounded-lg border transition-all ${
                  format === 'json' 
                    ? 'bg-purple-500/20 border-purple-500/50 shadow-lg'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50'
                }`}
              >
                <FileJson className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <div className="text-xs font-medium text-purple-300">JSON</div>
                <div className="text-xs text-purple-500/70">Yapısal</div>
              </button>
            </div>
          </div>
          
          {/* Export Butonu */}
          <button
            onClick={handleExport}
            disabled={loading || !ihaleId}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              loading || !ihaleId
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:shadow-purple-500/50 text-white shadow-2xl'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Export Ediliyor...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                {format.toUpperCase()} İndir
              </>
            )}
          </button>
          
          {/* Sonuç */}
          {result && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h3 className="text-green-400 font-medium mb-2">✅ Export Başarılı!</h3>
              <div className="text-xs text-slate-300">
                <div>Format: {result.format.toUpperCase()}</div>
                {result.count && <div>Tablo sayısı: {result.count}</div>}
                {result.length && <div>Metin uzunluğu: {result.length} karakter</div>}
                <div>Dosya indirildi: ihale_{result.ihaleId}.{result.format}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>💡 Bu sayfa direkt ihale verisini export eder</p>
          <p>Sadece İhale ID gir ve istediğin formatı seç!</p>
        </div>
      </div>
    </div>
  );
}
