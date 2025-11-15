"use client";

import { PIPELINE_STEPS, usePipelineStore } from "@/store/usePipelineStore";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  // Search, // Not used yet - reserved for future search feature
  Download,
  FileText,
  Filter,
  Loader2,
  TrendingUp,
  Upload,
  X
} from "lucide-react";
import { useCallback, useState } from "react";

interface MenuItem {
  yemek: string;
  gramaj: number;
  ogun?: string;
  kisi?: number;
  kategori?: string;
}

interface ApiResponse {
  success: boolean;
  data?: MenuItem[];
  meta?: {
    duration_ms: number;
    model: string;
    estimated_tokens: number;
    items_count: number;
  };
  error?: string;
  details?: string;
}

export function FileParserTab() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // Reserved for future search/filter features
  const searchTerm = ""; // const [searchTerm, setSearchTerm] = useState("");
  const filterCategory = "all"; // const [filterCategory, setFilterCategory] = useState<string>("all");

  const { setMenuData, markStepCompleted } = usePipelineStore();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/menu-robot", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.data) {
        setMenuData(data.data);
        markStepCompleted(PIPELINE_STEPS.MENU_UPLOAD);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
    }
  }

  const exportJSON = () => {
    if (!result?.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    if (!result?.data) return;
    const headers = ['Yemek', 'Gramaj', 'Öğün', 'Kişi', 'Kategori'];
    const rows = result.data.map(item => [
      item.yemek,
      item.gramaj,
      item.ogun || '',
      item.kisi || '',
      item.kategori || ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${Date.now()}.csv`;
    a.click();
  };

  const filteredData = result?.data?.filter(item => {
    const matchesSearch = item.yemek.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.kategori === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(result?.data?.map(item => item.kategori).filter(Boolean))];
  const totalGramaj = filteredData?.reduce((sum, item) => sum + item.gramaj, 0) || 0;

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'çorba': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'ana yemek': 'bg-red-500/20 text-red-400 border-red-500/30',
      'yan yemek': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'salata': 'bg-green-500/20 text-green-400 border-green-500/30',
      'tatlı': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'içecek': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
    return colors[category?.toLowerCase() || ''] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`glass-card rounded-2xl border-2 border-dashed transition-all duration-300 ${
              dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700/50'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className={`w-6 h-6 ${dragActive ? 'text-blue-400 animate-bounce' : 'text-slate-400'}`} />
                <h3 className="text-lg font-semibold text-white">Dosya Yükle</h3>
              </div>

              {file ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-white font-medium">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setFile(null)} aria-label="Dosyayı kaldır" className="p-1.5 hover:bg-slate-700 rounded-lg">
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl
                      font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50
                      flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analiz Ediliyor...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Analiz Başlat
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 mb-4">
                    Menü dosyasını sürükle bırak veya seç
                  </p>
                  <label className="inline-block px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800
                    text-white rounded-xl font-medium cursor-pointer transition-colors text-sm">
                    <input
                      type="file"
                      accept=".csv,.txt,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    Dosya Seç
                  </label>
                  <p className="text-xs text-slate-500 mt-3">CSV, TXT, PDF</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2">
        {result?.success && result?.data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Öğe', value: result.data.length, icon: FileText },
                { label: 'Gramaj', value: `${totalGramaj.toLocaleString()}g`, icon: TrendingUp },
                { label: 'Kategori', value: categories.length, icon: Filter },
                { label: 'Süre', value: `${result.meta?.duration_ms || 0}ms`, icon: Check }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="glass-card p-4 rounded-xl">
                    <Icon className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={exportJSON} className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800
                rounded-lg text-sm flex items-center gap-2 border border-slate-700/50 text-slate-300">
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button onClick={exportCSV} className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800
                rounded-lg text-sm flex items-center gap-2 border border-slate-700/50 text-slate-300">
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-slate-400 text-xs">Yemek</th>
                    <th className="text-right p-4 text-slate-400 text-xs">Gramaj</th>
                    <th className="text-center p-4 text-slate-400 text-xs">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData?.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="p-4 text-white">{item.yemek}</td>
                      <td className="p-4 text-right text-cyan-400 font-mono text-sm">
                        {item.gramaj.toLocaleString()}g
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.kategori)}`}>
                          {item.kategori || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : result && !result.success ? (
          <div className="glass-card p-6 rounded-xl border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Hata</h3>
                <p className="text-slate-300 text-sm">{result.error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 rounded-2xl text-center">
            <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Dosya Bekleniyor</h3>
            <p className="text-slate-400 text-sm">
              Menü dosyanızı yükleyin ve AI ile analiz edin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
