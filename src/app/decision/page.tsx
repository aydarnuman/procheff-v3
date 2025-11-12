/**
 * AI Teklif Karar Motoru UI
 * Katıl / Katılma / Dikkatli Katıl kararı üretir
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Brain, Calendar, CheckCircle, DollarSign, FileText, Info, Lightbulb, Target, TrendingUp, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePipelineStore, PIPELINE_STEPS } from "@/store/usePipelineStore";
import { PipelineNavigator } from "@/components/ui/PipelineNavigator";

interface DecisionData {
  karar: "Katıl" | "Katılma" | "Dikkatli Katıl";
  gerekce: string;
  risk_orani: string;
  tahmini_kar_orani: string;
  stratejik_oneriler?: string[];
  kritik_noktalar?: string[];
}

interface DecisionResponse {
  success: boolean;
  data?: DecisionData;
  meta?: {
    duration_ms: number;
    model: string;
    estimated_tokens: number;
    timestamp: string;
  };
  error?: string;
}

export default function DecisionPage() {
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const {
    selectedTender,
    menuData,
    costAnalysis,
    setDecision: saveDecision,
    setCurrentStep,
    markStepCompleted,
    getProgress
  } = usePipelineStore();

  useEffect(() => {
    setCurrentStep(PIPELINE_STEPS.DECISION);
  }, [setCurrentStep]);

  // Store'dan gelen verileri kullan veya default değerleri göster
  const [input] = useState({
    cost_analysis: costAnalysis || {
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
      optimizasyon_onerileri: [
        "Sebze alımlarını mevsimsel yapın",
        "Tedarikçi sayısını artırın",
        "Toplu alım indirimi talep edin",
      ],
    },
    menu_data: menuData || [
      { yemek: "Tavuk Sote", gramaj: 180, kisi: 250, kategori: "ana yemek" },
      { yemek: "Pilav", gramaj: 200, kisi: 250, kategori: "ana yemek" },
      { yemek: "Çorba", gramaj: 250, kisi: 250, kategori: "çorba" },
      { yemek: "Salata", gramaj: 100, kisi: 250, kategori: "salata" },
      { yemek: "Yoğurt", gramaj: 150, kisi: 250, kategori: "yan ürün" },
    ],
    ihale_bilgileri: {
      kurum: selectedTender?.organization || "Milli Eğitim Müdürlüğü",
      ihale_turu: selectedTender?.tenderType || "Okul Yemeği",
      sure: selectedTender?.duration || "12 ay",
      butce: selectedTender?.budget || "500000 TL",
    },
  });

  const analyze = async () => {
    setLoading(true);
    setDecision(null);

    try {
      const res = await fetch("/api/ai/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: DecisionResponse = await res.json();
      setDecision(data);

      // Store'a kaydet
      if (data.success && data.data) {
        saveDecision(data.data);
        markStepCompleted(PIPELINE_STEPS.DECISION);
      }
    } catch (err) {
      setDecision({
        success: false,
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
    }
  };

  const getKararColor = (karar: string) => {
    switch (karar) {
      case "Katıl":
        return "text-[(--color-accent-mint)]";
      case "Katılma":
        return "text-[(--color-accent-red)]";
      case "Dikkatli Katıl":
        return "text-[(--color-accent-gold)]";
      default:
        return "text-[(--color-text-secondary)]";
    }
  };

  const getKararBorderColor = (karar: string) => {
    switch (karar) {
      case "Katıl":
        return "border-[(--color-accent-mint)]";
      case "Katılma":
        return "border-[(--color-accent-red)]";
      case "Dikkatli Katıl":
        return "border-[(--color-accent-gold)]";
      default:
        return "border-[(--color-border)]";
    }
  };

  const getKararIcon = (karar: string) => {
    switch (karar) {
      case "Katıl":
        return CheckCircle;
      case "Katılma":
        return XCircle;
      case "Dikkatli Katıl":
        return AlertCircle;
      default:
        return Info;
    }
  };

  return (
    <motion.div
      className="min-h-screen p-6 md:p-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Pipeline İlerlemesi</span>
            <span>{getProgress()}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div
              className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${getProgress()}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Selected Tender and Cost Analysis Info */}
        {selectedTender && (
          <div className="glass-card p-4 mb-6 bg-linear-to-r from-indigo-500/10 to-transparent border-indigo-500/30">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-400">Seçili İhale</p>
                <p className="font-medium text-white">
                  {(selectedTender as any).kurum || selectedTender.organization} - {(selectedTender as any).ihale_no || selectedTender.id}
                </p>
                {costAnalysis && (
                  <p className="text-xs text-slate-400 mt-1">
                    Maliyet Analizi: {costAnalysis.gunluk_kisi_maliyeti || 'Tamamlandı'} • Karlılık: {costAnalysis.onerilen_karlilik_orani || '%7.5'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/cost-analysis')}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Maliyet Analizine Dön</span>
          </button>

          {decision?.success && decision?.data && (
            <button
              onClick={() => {
                setCurrentStep(PIPELINE_STEPS.PROPOSAL);
                router.push('/reports');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition-all group"
            >
              <span>Teklif Hazırla</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Header */}
        <motion.div variants={fadeInUp}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Target className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  AI Teklif Karar Motoru
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Claude Sonnet 4.5 ile stratejik ihale katılım kararı
                </p>
              </div>
            </div>
            <Button
              onClick={analyze}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="lg"
              icon={<Brain className="w-5 h-5" />}
            >
              {loading ? "AI Analiz Yapıyor" : "Karar Oluştur"}
            </Button>
          </div>
        </motion.div>

        {/* Input Data Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-[(--color-accent-mint)]" />
                  <CardTitle className="h4">Maliyet Analizi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Kişi Maliyeti</p>
                  <p className="h4 text-[(--color-text-primary)]">{input.cost_analysis.gunluk_kisi_maliyeti}</p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Toplam Gider</p>
                  <p className="h4 text-[(--color-text-primary)]">{input.cost_analysis.tahmini_toplam_gider}</p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Karlılık</p>
                  <p className="h4 text-[(--color-accent-mint)]">
                    {input.cost_analysis.onerilen_karlilik_orani}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[(--color-accent-blue)]" />
                  <CardTitle className="h4">Menü Bilgisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Toplam Öğe</p>
                  <p className="h4 text-[(--color-text-primary)]">{input.menu_data.length} adet</p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Toplam Gramaj</p>
                  <p className="h4 text-[(--color-text-primary)]">
                    {input.menu_data.reduce((sum, item) => sum + item.gramaj, 0)}g
                  </p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Kişi Sayısı</p>
                  <p className="h4 text-[(--color-accent-blue)]">{input.menu_data[0]?.kisi || 0} kişi</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[(--color-accent-purple)]" />
                  <CardTitle className="h4">İhale Bilgisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Kurum</p>
                  <p className="h4 text-[(--color-text-primary)]">{input.ihale_bilgileri.kurum}</p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Süre</p>
                  <p className="h4 text-[(--color-text-primary)]">{input.ihale_bilgileri.sure}</p>
                </div>
                <div>
                  <p className="body-sm text-[(--color-text-tertiary)] mb-1">Bütçe</p>
                  <p className="h4 text-[(--color-accent-purple)]">
                    {input.ihale_bilgileri.butce}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Decision Result */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card variant="elevated" className="border border-[(--color-accent-blue)]/30">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <motion.div
                      className="relative"
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Brain className="w-16 h-16 text-[(--color-accent-blue)]" />
                    </motion.div>
                    <div className="text-center">
                      <p className="h4 text-[(--color-text-primary)] mb-2">Claude Sonnet 4.5 Analiz Yapıyor</p>
                      <p className="body-sm text-[(--color-text-tertiary)]">Veriler işleniyor ve karar oluşturuluyor...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {decision && decision.success && decision.data && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {/* Main Decision Card */}
              <Card
                variant="elevated"
                className={`border-2 ${getKararBorderColor(decision.data.karar)}`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      {(() => {
                        const Icon = getKararIcon(decision.data.karar);
                        return <Icon className={`w-16 h-16 ${getKararColor(decision.data.karar)}`} />;
                      })()}
                    </motion.div>
                    <div>
                      <h2 className={`h1 ${getKararColor(decision.data.karar)}`}>
                        {decision.data.karar}
                      </h2>
                      <p className="body text-[(--color-text-secondary)] mt-2">
                        {decision.data.gerekce}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Metrics */}
                    <div className="space-y-4">
                      <motion.div
                        className="glass-subtle p-6 rounded-xl border border-[(--color-accent-gold)]/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <AlertTriangle className="w-6 h-6 text-[(--color-accent-gold)]" />
                          <p className="body-sm text-[(--color-text-tertiary)]">Risk Oranı</p>
                        </div>
                        <p className="h2 text-[(--color-accent-gold)]">
                          {decision.data.risk_orani}
                        </p>
                      </motion.div>

                      <motion.div
                        className="glass-subtle p-6 rounded-xl border border-[(--color-accent-mint)]/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="w-6 h-6 text-[(--color-accent-mint)]" />
                          <p className="body-sm text-[(--color-text-tertiary)]">Tahmini Kâr</p>
                        </div>
                        <p className="h2 text-[(--color-accent-mint)]">
                          {decision.data.tahmini_kar_orani}
                        </p>
                      </motion.div>
                    </div>

                    {/* Suggestions & Critical Points */}
                    <div className="space-y-6">
                      {decision.data.stratejik_oneriler &&
                        decision.data.stratejik_oneriler.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb className="w-5 h-5 text-[(--color-accent-blue)]" />
                              <h4 className="h5 text-[(--color-text-primary)]">
                                Stratejik Öneriler
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {decision.data.stratejik_oneriler.map((oneri, idx) => (
                                <motion.li
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-start gap-2 body-sm text-[(--color-text-secondary)]"
                                >
                                  <span className="text-[(--color-accent-blue)] mt-1">•</span>
                                  <span>{oneri}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {decision.data.kritik_noktalar &&
                        decision.data.kritik_noktalar.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5 text-[(--color-accent-red)]" />
                              <h4 className="h5 text-[(--color-text-primary)]">
                                Kritik Noktalar
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {decision.data.kritik_noktalar.map((nokta, idx) => (
                                <motion.li
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-start gap-2 body-sm text-[(--color-text-secondary)]"
                                >
                                  <span className="text-[(--color-accent-red)] mt-1">•</span>
                                  <span>{nokta}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meta Info */}
              {decision.meta && (
                <Card variant="subtle">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-[(--color-accent-blue)]" />
                      <CardTitle>AI İşlem Bilgisi</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Model</Badge>
                        <span className="body font-mono text-[(--color-accent-mint)]">
                          {decision.meta.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="info">Süre</Badge>
                        <span className="body font-mono text-[(--color-accent-blue)]">
                          {decision.meta.duration_ms} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Token</Badge>
                        <span className="body font-mono text-[(--color-text-secondary)]">
                          ~{decision.meta.estimated_tokens}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Zaman</Badge>
                        <span className="body-sm font-mono text-[(--color-text-tertiary)]">
                          {new Date(decision.meta.timestamp).toLocaleTimeString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {decision && !decision.success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border border-[(--color-accent-red)]/30 bg-[(--color-accent-red)]/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[(--color-accent-red)]/20">
                      <XCircle className="w-8 h-8 text-[(--color-accent-red)]" />
                    </div>
                    <div>
                      <h3 className="h3 text-[(--color-accent-red)] mb-2">Hata Oluştu</h3>
                      <p className="body text-[(--color-text-secondary)]">{decision.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pipeline Navigation */}
        <div className="mt-8">
          <PipelineNavigator
            currentStep="decision"
            enableNext={decision?.success === true && decision?.data !== undefined}
            onNext={() => {
              if (decision?.data) {
                saveDecision(decision.data as any);
                markStepCompleted(PIPELINE_STEPS.DECISION);
                router.push('/reports');
              }
            }}
          />

          {/* Quick Action to Reports */}
          {decision?.success && decision?.data && (
            <button
              onClick={() => {
                saveDecision(decision.data as any);
                markStepCompleted(PIPELINE_STEPS.DECISION);
                router.push('/reports');
              }}
              className="w-full mt-4 px-6 py-3 btn-gradient rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Rapor ve Teklif Hazırla
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
