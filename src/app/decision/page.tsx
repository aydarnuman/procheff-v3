/**
 * AI Teklif Karar Motoru UI
 * Katıl / Katılma / Dikkatli Katıl kararı üretir
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Brain, TrendingUp, AlertTriangle, Lightbulb, DollarSign, Users, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

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

  // Sample input data - gerçek senaryoda önceki modüllerden gelecek
  const [input] = useState({
    cost_analysis: {
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
    menu_data: [
      { yemek: "Tavuk Sote", gramaj: 180, kisi: 250, kategori: "ana yemek" },
      { yemek: "Pilav", gramaj: 200, kisi: 250, kategori: "ana yemek" },
      { yemek: "Çorba", gramaj: 250, kisi: 250, kategori: "çorba" },
      { yemek: "Salata", gramaj: 100, kisi: 250, kategori: "salata" },
      { yemek: "Yoğurt", gramaj: 150, kisi: 250, kategori: "yan ürün" },
    ],
    ihale_bilgileri: {
      kurum: "Milli Eğitim Müdürlüğü",
      ihale_turu: "Okul Yemeği",
      sure: "12 ay",
      butce: "500000 TL",
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
        return "text-[var(--color-accent-mint)]";
      case "Katılma":
        return "text-[var(--color-accent-red)]";
      case "Dikkatli Katıl":
        return "text-[var(--color-accent-gold)]";
      default:
        return "text-[var(--color-text-secondary)]";
    }
  };

  const getKararBorderColor = (karar: string) => {
    switch (karar) {
      case "Katıl":
        return "border-[var(--color-accent-mint)]";
      case "Katılma":
        return "border-[var(--color-accent-red)]";
      case "Dikkatli Katıl":
        return "border-[var(--color-accent-gold)]";
      default:
        return "border-[var(--color-border)]";
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
        {/* Header */}
        <motion.div variants={fadeInUp}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-glow-purple"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Target className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="h1">AI Teklif Karar Motoru</h1>
                <p className="body text-[var(--color-text-secondary)]">
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
                  <DollarSign className="w-5 h-5 text-[var(--color-accent-mint)]" />
                  <CardTitle className="h4">Maliyet Analizi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Kişi Maliyeti</p>
                  <p className="h4 text-[var(--color-text-primary)]">{input.cost_analysis.gunluk_kisi_maliyeti}</p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Toplam Gider</p>
                  <p className="h4 text-[var(--color-text-primary)]">{input.cost_analysis.tahmini_toplam_gider}</p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Karlılık</p>
                  <p className="h4 text-[var(--color-accent-mint)]">
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
                  <FileText className="w-5 h-5 text-[var(--color-accent-blue)]" />
                  <CardTitle className="h4">Menü Bilgisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Toplam Öğe</p>
                  <p className="h4 text-[var(--color-text-primary)]">{input.menu_data.length} adet</p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Toplam Gramaj</p>
                  <p className="h4 text-[var(--color-text-primary)]">
                    {input.menu_data.reduce((sum, item) => sum + item.gramaj, 0)}g
                  </p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Kişi Sayısı</p>
                  <p className="h4 text-[var(--color-accent-blue)]">{input.menu_data[0]?.kisi || 0} kişi</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[var(--color-accent-purple)]" />
                  <CardTitle className="h4">İhale Bilgisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Kurum</p>
                  <p className="h4 text-[var(--color-text-primary)]">{input.ihale_bilgileri.kurum}</p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Süre</p>
                  <p className="h4 text-[var(--color-text-primary)]">{input.ihale_bilgileri.sure}</p>
                </div>
                <div>
                  <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Bütçe</p>
                  <p className="h4 text-[var(--color-accent-purple)]">
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
              <Card variant="elevated" className="border border-[var(--color-accent-blue)]/30">
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
                      <Brain className="w-16 h-16 text-[var(--color-accent-blue)]" />
                    </motion.div>
                    <div className="text-center">
                      <p className="h4 text-[var(--color-text-primary)] mb-2">Claude Sonnet 4.5 Analiz Yapıyor</p>
                      <p className="body-sm text-[var(--color-text-tertiary)]">Veriler işleniyor ve karar oluşturuluyor...</p>
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
                      <p className="body text-[var(--color-text-secondary)] mt-2">
                        {decision.data.gerekce}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Metrics */}
                    <div className="space-y-4">
                      <motion.div
                        className="glass-subtle p-6 rounded-xl border border-[var(--color-accent-gold)]/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <AlertTriangle className="w-6 h-6 text-[var(--color-accent-gold)]" />
                          <p className="body-sm text-[var(--color-text-tertiary)]">Risk Oranı</p>
                        </div>
                        <p className="h2 text-[var(--color-accent-gold)]">
                          {decision.data.risk_orani}
                        </p>
                      </motion.div>

                      <motion.div
                        className="glass-subtle p-6 rounded-xl border border-[var(--color-accent-mint)]/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="w-6 h-6 text-[var(--color-accent-mint)]" />
                          <p className="body-sm text-[var(--color-text-tertiary)]">Tahmini Kâr</p>
                        </div>
                        <p className="h2 text-[var(--color-accent-mint)]">
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
                              <Lightbulb className="w-5 h-5 text-[var(--color-accent-blue)]" />
                              <h4 className="h5 text-[var(--color-text-primary)]">
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
                                  className="flex items-start gap-2 body-sm text-[var(--color-text-secondary)]"
                                >
                                  <span className="text-[var(--color-accent-blue)] mt-1">•</span>
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
                              <AlertTriangle className="w-5 h-5 text-[var(--color-accent-red)]" />
                              <h4 className="h5 text-[var(--color-text-primary)]">
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
                                  className="flex items-start gap-2 body-sm text-[var(--color-text-secondary)]"
                                >
                                  <span className="text-[var(--color-accent-red)] mt-1">•</span>
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
                      <Info className="w-5 h-5 text-[var(--color-accent-blue)]" />
                      <CardTitle>AI İşlem Bilgisi</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Model</Badge>
                        <span className="body font-mono text-[var(--color-accent-mint)]">
                          {decision.meta.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="info">Süre</Badge>
                        <span className="body font-mono text-[var(--color-accent-blue)]">
                          {decision.meta.duration_ms} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Token</Badge>
                        <span className="body font-mono text-[var(--color-text-secondary)]">
                          ~{decision.meta.estimated_tokens}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Zaman</Badge>
                        <span className="body-sm font-mono text-[var(--color-text-tertiary)]">
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
              <Card className="border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[var(--color-accent-red)]/20">
                      <XCircle className="w-8 h-8 text-[var(--color-accent-red)]" />
                    </div>
                    <div>
                      <h3 className="h3 text-[var(--color-accent-red)] mb-2">Hata Oluştu</h3>
                      <p className="body text-[var(--color-text-secondary)]">{decision.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
