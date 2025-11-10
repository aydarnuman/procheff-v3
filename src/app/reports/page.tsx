/**
 * Reports Page - PDF/Excel Export UI
 * Generates downloadable reports from analysis data
 */

"use client";

import { useState } from "react";

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

export default function ReportsPage() {
  const [loading, setLoading] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <div>
          <h1 className="h1">📄 AI Teklif Raporu</h1>
          <p className="text-gray-400">
            Analiz sonuçlarınızı PDF veya Excel formatında indirin
          </p>
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
      </div>
    </div>
  );
}
