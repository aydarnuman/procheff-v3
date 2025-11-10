'use client';

import { useState } from 'react';
import { Upload, Download, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BulkResult {
  product: string;
  unit?: string;
  ok: boolean;
  data?: {
    price: number;
    conf: number;
    unit: string;
  };
  error?: string;
  message?: string;
}

interface BulkUploaderProps {
  onResultsReady?: (results: BulkResult[]) => void;
}

export function BulkUploader({ onResultsReady }: BulkUploaderProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);

  const handleParse = () => {
    const lines = text.trim().split('\n');
    const items = [];

    for (const line of lines) {
      const [product, unit] = line.split(',').map(s => s.trim());
      if (product) {
        items.push({ product, unit });
      }
    }

    return items;
  };

  const handleSubmit = async () => {
    const items = handleParse();

    if (items.length === 0) {
      alert('Lütfen en az 1 ürün girin');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch('/api/market/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (data.ok) {
        setResults(data.results || []);
        onResultsReady?.(data.results);
      } else {
        alert(data.message || 'Toplu sorgu başarısız');
      }
    } catch (error) {
      alert('Ağ hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/market/bulk?format=csv';
  };

  const handleExportResults = () => {
    const csv = ['Ürün,Birim,Fiyat (₺),Güven (%),Durum'];

    for (const r of results) {
      const status = r.ok ? 'Başarılı' : 'Başarısız';
      const price = r.data?.price?.toFixed(2) || '-';
      const conf = r.data?.conf ? (r.data.conf * 100).toFixed(0) : '-';
      const unit = r.data?.unit || r.unit || '-';

      csv.push(`${r.product},${unit},${price},${conf},${status}`);
    }

    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `piyasa-robotu-sonuc-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Toplu Ürün Listesi</h3>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-white"
          >
            <Download className="w-4 h-4" />
            Şablon İndir
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ürün adlarını girin (her satırda bir ürün):&#10;tavuk eti, kg&#10;zeytinyağı, lt&#10;makarna, kg"
          className="w-full h-40 px-4 py-3 bg-slate-900/40 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
        />

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-400">
            {handleParse().length} ürün tespit edildi
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Fiyatları Getir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Sonuçlar</h3>
            <button
              onClick={handleExportResults}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg transition-colors text-green-300"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-indigo-400">Durum</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-indigo-400">Ürün</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-indigo-400">Birim</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-indigo-400">Fiyat</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-indigo-400">Güven</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-white">{r.product}</td>
                    <td className="px-3 py-2 text-sm text-slate-400">{r.data?.unit || r.unit || '-'}</td>
                    <td className="px-3 py-2 text-sm text-right text-white font-medium">
                      {r.data?.price ? `${r.data.price.toFixed(2)} ₺` : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      {r.data?.conf ? (
                        <span className="text-green-400">{(r.data.conf * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
