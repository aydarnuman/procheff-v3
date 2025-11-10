/**
 * Report Builder Utility
 * Combines analysis, cost, and decision data into unified report payload
 */

export interface AnalysisData {
  kurum?: string;
  ihale_turu?: string;
  sure?: string;
  butce?: string;
  [key: string]: unknown;
}

export interface CostData {
  gunluk_kisi_maliyeti?: string;
  tahmini_toplam_gider?: string;
  onerilen_karlilik_orani?: string;
  riskli_kalemler?: string[];
  maliyet_dagilimi?: {
    hammadde?: string;
    iscilik?: string;
    genel_giderler?: string;
    kar?: string;
  };
  optimizasyon_onerileri?: string[];
}

export interface DecisionData {
  karar?: "Katıl" | "Katılma" | "Dikkatli Katıl";
  gerekce?: string;
  risk_orani?: string;
  tahmini_kar_orani?: string;
  stratejik_oneriler?: string[];
  kritik_noktalar?: string[];
}

export interface MenuData {
  yemek: string;
  gramaj: number;
  ogun?: string;
  kisi?: number;
  kategori?: string;
}

export interface ReportPayload {
  // Temel Bilgiler
  kurum: string;
  ihale_turu: string;
  sure: string;
  butce: string;

  // Maliyet Bilgileri
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

  // Karar Bilgileri
  karar: string;
  risk_orani: string;
  tahmini_kar_orani: string;
  gerekce: string;
  stratejik_oneriler: string[];
  kritik_noktalar: string[];

  // Menü Bilgileri (opsiyonel)
  menu_items?: MenuData[];
  toplam_gramaj?: number;
  kisi_sayisi?: number;

  // Meta Bilgiler
  tarih: string;
  timestamp: string;
  model: string;
}

/**
 * Builds a unified report payload from separate analysis modules
 */
export function buildReportPayload(
  analysis?: AnalysisData,
  cost?: CostData,
  decision?: DecisionData,
  menu?: MenuData[]
): ReportPayload {
  const now = new Date();

  // Calculate menu totals if available
  const toplam_gramaj = menu?.reduce((sum, item) => sum + item.gramaj, 0) || 0;
  const kisi_sayisi = menu?.[0]?.kisi || 0;

  return {
    // Temel Bilgiler
    kurum: analysis?.kurum || "—",
    ihale_turu: analysis?.ihale_turu || "—",
    sure: analysis?.sure || "—",
    butce: analysis?.butce || "—",

    // Maliyet Bilgileri
    gunluk_kisi_maliyeti: cost?.gunluk_kisi_maliyeti || "—",
    tahmini_toplam_gider: cost?.tahmini_toplam_gider || "—",
    onerilen_karlilik_orani: cost?.onerilen_karlilik_orani || "—",
    riskli_kalemler: cost?.riskli_kalemler || [],
    maliyet_dagilimi: {
      hammadde: cost?.maliyet_dagilimi?.hammadde || "—",
      iscilik: cost?.maliyet_dagilimi?.iscilik || "—",
      genel_giderler: cost?.maliyet_dagilimi?.genel_giderler || "—",
      kar: cost?.maliyet_dagilimi?.kar || "—",
    },

    // Karar Bilgileri
    karar: decision?.karar || "—",
    risk_orani: decision?.risk_orani || "—",
    tahmini_kar_orani: decision?.tahmini_kar_orani || "—",
    gerekce: decision?.gerekce || "—",
    stratejik_oneriler: decision?.stratejik_oneriler || [],
    kritik_noktalar: decision?.kritik_noktalar || [],

    // Menü Bilgileri
    menu_items: menu,
    toplam_gramaj: toplam_gramaj > 0 ? toplam_gramaj : undefined,
    kisi_sayisi: kisi_sayisi > 0 ? kisi_sayisi : undefined,

    // Meta Bilgiler
    tarih: now.toLocaleString("tr-TR"),
    timestamp: now.toISOString(),
    model: "claude-sonnet-4-20250514",
  };
}

/**
 * Formats currency values for display
 */
export function formatCurrency(value: string | number): string {
  if (typeof value === "number") {
    return `${value.toLocaleString("tr-TR")} TL`;
  }
  return value;
}

/**
 * Formats percentage values for display
 */
export function formatPercentage(value: string | number): string {
  if (typeof value === "number") {
    return `%${value.toFixed(1)}`;
  }
  return value;
}

/**
 * Generates a report filename with timestamp
 */
export function generateReportFilename(type: "pdf" | "xlsx"): string {
  const timestamp = Date.now();
  const date = new Date().toISOString().split("T")[0];
  return `procheff-rapor-${date}-${timestamp}.${type}`;
}
