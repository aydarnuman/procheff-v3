"use client";

import { useState } from "react";

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

export default function MenuParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parser/menu", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
    }
  }

  const totalGramaj = result?.data?.reduce((sum, item) => sum + item.gramaj, 0) || 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="h1 flex items-center gap-2">
          🍱 Menü Analiz Sistemi
        </h1>
        <p className="text-slate-400">
          CSV veya TXT formatında menü dosyası yükleyin, AI otomatik çözümlesin
        </p>
      </div>

      {/* Upload Card */}
      <div className="glass-card mb-8">
        <h2 className="h2">📁 Dosya Yükle</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Menü Dosyası Seçin (CSV, TXT, PDF)
            </label>
            <input
              type="file"
              accept=".csv,.txt,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-900 file:text-cyan-100 hover:file:bg-cyan-800 cursor-pointer"
            />
            {file && (
              <p className="mt-2 text-sm text-slate-500">
                Seçili: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-gradient w-full md:w-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Çözümleniyor...
              </span>
            ) : (
              "🔍 Menüyü Çözümle"
            )}
          </button>
        </div>
      </div>

        {/* Results */}
        {result && result.success && result.data && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass p-6">
                <div className="text-sm text-slate-400 mb-1">
                  Toplam Yemek Çeşidi
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {result.data.length}
                </div>
              </div>

              <div className="glass p-6">
                <div className="text-sm text-slate-400 mb-1">
                  Toplam Gramaj
                </div>
                <div className="text-3xl font-bold text-green-400">
                  {totalGramaj.toLocaleString("tr-TR")} g
                </div>
              </div>

              <div className="glass p-6">
                <div className="text-sm text-slate-400 mb-1">
                  Kişi Sayısı
                </div>
                <div className="text-3xl font-bold text-purple-400">
                  {result.data[0]?.kisi || "N/A"}
                </div>
              </div>
            </div>

            {/* Menu Table */}
            <div className="glass-card">
              <h2 className="h2 mb-4">📋 Menü Detayları</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-3 text-slate-400 font-semibold">
                          #
                        </th>
                        <th className="text-left p-3 text-slate-400 font-semibold">
                          Yemek Adı
                        </th>
                        <th className="text-right p-3 text-slate-400 font-semibold">
                          Gramaj (g)
                        </th>
                        <th className="text-center p-3 text-slate-400 font-semibold">
                          Öğün
                        </th>
                        <th className="text-right p-3 text-slate-400 font-semibold">
                          Kişi
                        </th>
                        <th className="text-center p-3 text-slate-400 font-semibold">
                          Kategori
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3 text-slate-500">{idx + 1}</td>
                          <td className="p-3 text-slate-200 font-medium">
                            {item.yemek}
                          </td>
                          <td className="p-3 text-right text-cyan-400 font-mono">
                            {item.gramaj.toLocaleString("tr-TR")}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                              {item.ogun || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-right text-green-400 font-mono">
                            {item.kisi?.toLocaleString("tr-TR") || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs capitalize">
                              {item.kategori || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-800/50 font-bold">
                        <td colSpan={2} className="p-3 text-slate-300">
                          TOPLAM
                        </td>
                        <td className="p-3 text-right text-cyan-400 font-mono">
                          {totalGramaj.toLocaleString("tr-TR")} g
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>

            {/* Meta Info */}
            {result.meta && (
              <div className="glass-card">
                <h2 className="h2 mb-4">ℹ️ Analiz Bilgileri</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Süre: </span>
                      <span className="text-cyan-400 font-mono">
                        {result.meta.duration_ms} ms
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Model: </span>
                      <span className="text-green-400">
                        {result.meta.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Token: </span>
                      <span className="text-purple-400 font-mono">
                        ~{result.meta.estimated_tokens}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Öğe: </span>
                      <span className="text-cyan-400 font-mono">
                        {result.meta.items_count}
                      </span>
                    </div>
                  </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {result && !result.success && (
          <div className="glass-card">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-3xl">❌</span>
              <div>
                <p className="font-semibold">Hata Oluştu</p>
                <p className="text-sm">{result.error}</p>
                {result.details && (
                  <p className="text-xs text-slate-500 mt-1">
                    {result.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
