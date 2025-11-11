"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, ChevronRight } from "lucide-react";
import { usePipelineStore, PIPELINE_STEPS } from "@/store/usePipelineStore";
import { PipelineNavigator } from "@/components/ui/PipelineNavigator";

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

  const router = useRouter();
  const {
    selectedTender,
    setMenuData,
    setCurrentStep,
    markStepCompleted,
    getProgress,
    canProceedToStep
  } = usePipelineStore();

  useEffect(() => {
    setCurrentStep(PIPELINE_STEPS.MENU_UPLOAD);
  }, [setCurrentStep]);

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

      // Store'a kaydet
      if (data.success && data.data) {
        setMenuData(data.data);
        markStepCompleted(PIPELINE_STEPS.MENU_UPLOAD);
      }
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
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Selected Tender Info */}
        {selectedTender && (
          <div className="glass-card p-4 mb-6 bg-gradient-to-r from-indigo-500/10 to-transparent border-indigo-500/30">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-400">Seçili İhale</p>
                <p className="font-medium text-white">
                  {(selectedTender as any).kurum || selectedTender.organization} - {(selectedTender as any).ihale_no || selectedTender.id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Pipeline İlerlemesi</span>
            <span>{getProgress()}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push(selectedTender ? `/ihale/${selectedTender.id}` : '/ihale')}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Geri Dön</span>
          </button>

          {result?.success && result?.data && (
            <button
              onClick={() => {
                setCurrentStep(PIPELINE_STEPS.COST_ANALYSIS);
                router.push('/cost-analysis');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 transition-all group"
            >
              <span className="font-medium">Maliyet Analizine Geç</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Selected Tender Info */}
        {selectedTender && (
          <div className="glass-card mb-6 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Seçili İhale</p>
                <p className="text-sm font-semibold text-white">{selectedTender.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedTender.organization} • {selectedTender.city}
                </p>
              </div>
              <div className="text-right">
                {selectedTender.tenderDate && (
                  <p className="text-xs text-slate-400">Teklif Tarihi: {selectedTender.tenderDate}</p>
                )}
                {selectedTender.daysRemaining !== null && selectedTender.daysRemaining !== undefined && (
                  <p className={`text-xs mt-1 font-semibold ${
                    selectedTender.daysRemaining < 0 ? 'text-red-400' :
                    selectedTender.daysRemaining <= 7 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {selectedTender.daysRemaining < 0 ? 'Süresi geçti' :
                     selectedTender.daysRemaining === 0 ? 'Bugün!' :
                     `${selectedTender.daysRemaining} gün kaldı`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg">
            <span className="text-3xl">🍱</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Menü Analiz Sistemi
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              CSV veya TXT formatında menü dosyası yükleyin, AI otomatik çözümlesin
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            📁 Dosya Yükle
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Menü Dosyası Seçin (CSV, TXT, PDF)
              </label>
              <input
                type="file"
                accept=".csv,.txt,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer border border-white/10 rounded-lg bg-slate-900/50 px-3 py-2"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-500">
                  Seçili: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-gradient px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
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

        {/* Pipeline Navigation */}
        <div className="mt-8">
          <PipelineNavigator
            currentStep="menu"
            enableNext={result?.success && result?.data && result.data.length > 0}
            onNext={() => {
              if (result?.data) {
                setMenuData(result.data);
                markStepCompleted(PIPELINE_STEPS.MENU_UPLOAD);
                router.push('/cost-analysis');
              }
            }}
          />

          {/* Quick Action to Cost Analysis */}
          {result?.success && result?.data && (
            <button
              onClick={() => {
                setMenuData(result.data!);
                markStepCompleted(PIPELINE_STEPS.MENU_UPLOAD);
                router.push('/cost-analysis');
              }}
              className="w-full mt-4 px-6 py-3 btn-gradient rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              Maliyet Analizine Geç
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
