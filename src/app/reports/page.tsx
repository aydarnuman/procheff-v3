/**
 * Reports Page - PDF/Excel Export UI
 * Generates downloadable reports from analysis data
 */

"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Calendar, Eye, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface ReportData {
  analysis?: {
    kurum: string;
    ihale_turu: string;
    sure: string;
    butce: string;
  };
  cost?: {
    gunluk_kisi_maliyeti: string;
    tahmini_toplam_gider: string;
    onerilen_karlilik_orani: string;
    riskli_kalemler: string[];
    maliyet_dagilimi: {
      hammadde: string;
      iscilik: string;
      genel_giderler: string;
      kar: string;
    };
  };
  decision?: {
    karar: "Katıl" | "Katılma" | "Dikkatli Katıl";
    gerekce: string;
    risk_orani: string;
    tahmini_kar_orani: string;
    stratejik_oneriler: string[];
    kritik_noktalar: string[];
  };
  menu?: Array<{
    yemek: string;
    gramaj: number;
    ogun?: string;
    kisi?: number;
    kategori?: string;
  }>;
}

interface HistoricalReport {
  id: string;
  name: string;
  type: "pdf" | "xlsx";
  size: string;
  created_at: string;
  analysis_type: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historicalReports, setHistoricalReports] = useState<HistoricalReport[]>([]);

  // Sample data - gerçek senaryoda state management veya API'den gelecek
  const sampleData: ReportData = {
    analysis: {
      kurum: "Milli Eğitim Müdürlüğü",
      ihale_turu: "Okul Yemeği Hizmeti",
      sure: "12 ay",
      butce: "500000 TL",
    },
    cost: {
      gunluk_kisi_maliyeti: "22.45 TL",
      tahmini_toplam_gider: "463000 TL",
      onerilen_karlilik_orani: "%7.5",
      riskli_kalemler: ["Et ürünleri", "Sebze", "Yağ"],
      maliyet_dagilimi: {
        hammadde: "%65",
        iscilik: "%20",
        genel_giderler: "%10",
        kar: "%5",
      },
    },
    decision: {
      karar: "Katıl",
      gerekce: "Bütçe yeterli (500K vs 463K), düşük risk profili, okul yemeği sektörü stabil.",
      risk_orani: "%15.2",
      tahmini_kar_orani: "%8.2",
      stratejik_oneriler: [
        "Et ürünleri için uzun vadeli tedarikçi anlaşması yapın",
        "Sebze fiyat dalgalanmalarına karşı mevsimsel menü planlaması uygulayın",
        "Yağ fiyatları için hedge stratejisi geliştirin",
      ],
      kritik_noktalar: [
        "37K TL bütçe fazlası acil durum fonu olarak saklanmalı",
        "Riskli kalemlerin fiyat artışları yakından takip edilmeli",
      ],
    },
    menu: [
      { yemek: "Tavuk Sote", gramaj: 180, kisi: 250, ogun: "öğle", kategori: "ana yemek" },
      { yemek: "Pilav", gramaj: 200, kisi: 250, ogun: "öğle", kategori: "ana yemek" },
      { yemek: "Mercimek Çorbası", gramaj: 250, kisi: 250, ogun: "öğle", kategori: "çorba" },
      { yemek: "Mevsim Salatası", gramaj: 100, kisi: 250, ogun: "öğle", kategori: "salata" },
      { yemek: "Yoğurt", gramaj: 150, kisi: 250, ogun: "öğle", kategori: "yan ürün" },
      { yemek: "Ekmek", gramaj: 75, kisi: 250, ogun: "öğle", kategori: "yan ürün" },
      { yemek: "Ayran", gramaj: 200, kisi: 250, ogun: "öğle", kategori: "içecek" },
    ],
  };

  useEffect(() => {
    // Fetch historical reports
    // TODO: Implement actual API endpoint
    setHistoricalReports([
      {
        id: "1",
        name: "İhale Analizi - Milli Eğitim",
        type: "pdf",
        size: "2.4 MB",
        created_at: new Date().toISOString(),
        analysis_type: "Oto Analiz",
      },
      {
        id: "2",
        name: "Maliyet Raporu - Okul Yemeği",
        type: "xlsx",
        size: "1.1 MB",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        analysis_type: "Maliyet",
      },
    ]);
  }, []);

  const generateReport = async (type: "pdf" | "xlsx") => {
    setLoading(type);
    setError(null);

    try {
      const response = await fetch(`/api/export/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sampleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rapor oluşturma başarısız");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `procheff-rapor.${type}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-linear-to-br from-blue-500 to-cyan-600 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI Teklif Raporu
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Analiz sonuçlarınızı PDF veya Excel formatında indirin
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="glass-card">
          <h2 className="h2 mb-2">Rapor Oluştur</h2>
          <p className="text-gray-400 text-sm mb-6">
            Maliyet analizi, karar motoru ve menü verilerini içeren tam rapor
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => generateReport("pdf")}
              disabled={loading !== null}
              className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading === "pdf" ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  PDF Oluşturuluyor...
                </>
              ) : (
                <>
                  📄 PDF İndir
                </>
              )}
            </button>

            <button
              onClick={() => generateReport("xlsx")}
              disabled={loading !== null}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-3 flex items-center gap-2 transition-colors"
            >
              {loading === "xlsx" ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Excel Oluşturuluyor...
                </>
              ) : (
                <>
                  📊 Excel İndir
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400">❌ {error}</p>
            </div>
          )}
        </div>

        {/* Report Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* İhale Bilgileri */}
          <div className="glass p-6">
            <h3 className="h3 text-sm mb-4">📋 İhale Bilgileri</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Kurum:</span>
                <span className="font-medium">{sampleData.analysis?.kurum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">İhale Türü:</span>
                <span className="font-medium">{sampleData.analysis?.ihale_turu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Süre:</span>
                <span className="font-medium">{sampleData.analysis?.sure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bütçe:</span>
                <span className="font-medium text-blue-400">{sampleData.analysis?.butce}</span>
              </div>
            </div>
          </div>

          {/* Maliyet Özeti */}
          <div className="glass p-6">
            <h3 className="h3 text-sm mb-4">💰 Maliyet Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Kişi Maliyeti:</span>
                <span className="font-medium">{sampleData.cost?.gunluk_kisi_maliyeti}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Toplam Gider:</span>
                <span className="font-medium">{sampleData.cost?.tahmini_toplam_gider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Karlılık:</span>
                <span className="font-medium text-green-400">
                  {sampleData.cost?.onerilen_karlilik_orani}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Oranı:</span>
                <span className="font-medium text-orange-400">
                  {sampleData.decision?.risk_orani}
                </span>
              </div>
            </div>
          </div>

          {/* Karar Özeti */}
          <div className="glass p-6">
            <h3 className="h3 text-sm mb-4">🧠 AI Kararı</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Karar:</span>
                <span
                  className={`font-bold ${
                    sampleData.decision?.karar === "Katıl"
                      ? "text-green-400"
                      : sampleData.decision?.karar === "Katılma"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {sampleData.decision?.karar}
                </span>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Gerekçe:</p>
                <p className="text-gray-300 text-xs">{sampleData.decision?.gerekce}</p>
              </div>
            </div>
          </div>

          {/* Menü Özeti */}
          <div className="glass p-6">
            <h3 className="h3 text-sm mb-4">🍽️ Menü Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Toplam Öğe:</span>
                <span className="font-medium">{sampleData.menu?.length || 0} adet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Toplam Gramaj:</span>
                <span className="font-medium">
                  {sampleData.menu?.reduce((sum, item) => sum + item.gramaj, 0) || 0}g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kişi Sayısı:</span>
                <span className="font-medium">{sampleData.menu?.[0]?.kisi || 0} kişi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-card border-blue-500">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="text-sm text-gray-300">
              <p className="font-semibold mb-1">Rapor İçeriği:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>İhale bilgileri ve bütçe analizi</li>
                <li>Maliyet dağılımı ve riskli kalemler</li>
                <li>AI karar analizi ve gerekçesi</li>
                <li>Stratejik öneriler ve kritik noktalar</li>
                <li>Menü listesi ve gramaj bilgileri (Excel&apos;de ayrı sheet)</li>
                <li>Model ve zaman damgası bilgileri</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Historical Reports */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="h2 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" />
              Geçmiş Raporlar
            </h2>
          </div>

          {historicalReports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Henüz oluşturulmuş rapor yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historicalReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 hover:border-indigo-500/50 transition-all"
                >
                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-purple-600/5 to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        report.type === "pdf"
                          ? "bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30"
                          : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          report.type === "pdf" ? "text-red-400" : "text-green-400"
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {report.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleDateString("tr-TR")}
                          </span>
                          <span>{report.size}</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs">
                            {report.analysis_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
