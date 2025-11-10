"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, TrendingUp, AlertTriangle, Lightbulb, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

interface CostAnalysisResult {
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
  raw_output?: string;
  parse_error?: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: CostAnalysisResult;
  meta?: {
    duration_ms: number;
    model: string;
    estimated_tokens: number;
  };
  error?: string;
}

export default function CostAnalysisPage() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    kurum: "Milli Eğitim Bakanlığı",
    ihale_turu: "Yemek Hizmeti",
    kisilik: "250",
    butce: "500000 TL",
  });

  async function analyze() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/cost-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extracted_data: input }),
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

  return (
    <motion.div
      className="min-h-screen p-6 md:p-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <motion.div
              className="p-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent-gold)] to-amber-600 shadow-glow-gold"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Calculator className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="h1">AI Maliyet Analiz Motoru</h1>
              <p className="body text-[var(--color-text-secondary)]">
                Claude Sonnet 4.5 ile akıllı maliyet hesaplama ve optimizasyon
              </p>
            </div>
          </div>
        </motion.div>

        {/* Input Form */}
        <motion.div variants={fadeInUp}>
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>İhale Bilgileri</CardTitle>
              <CardDescription>
                Maliyet analizi için ihale bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Kurum"
                  value={input.kurum}
                  onChange={(e) => setInput({ ...input, kurum: e.target.value })}
                  placeholder="Örn: Milli Eğitim Bakanlığı"
                />

                <Input
                  label="İhale Türü"
                  value={input.ihale_turu}
                  onChange={(e) => setInput({ ...input, ihale_turu: e.target.value })}
                  placeholder="Örn: Yemek Hizmeti"
                />

                <Input
                  label="Kişilik"
                  value={input.kisilik}
                  onChange={(e) => setInput({ ...input, kisilik: e.target.value })}
                  placeholder="Örn: 250"
                  type="number"
                />

                <Input
                  label="Bütçe"
                  value={input.butce}
                  onChange={(e) => setInput({ ...input, butce: e.target.value })}
                  placeholder="Örn: 500000 TL"
                />
              </div>

              <div className="mt-6">
                <Button
                  onClick={analyze}
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  icon={<Calculator className="w-5 h-5" />}
                  className="w-full md:w-auto"
                >
                  Maliyet Hesapla
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && result.success && result.data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Main Metrics */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div variants={scaleIn}>
                  <Card hoverable variant="elevated" className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[var(--color-accent-mint)]/20">
                          <TrendingUp className="w-6 h-6 text-[var(--color-accent-mint)]" />
                        </div>
                        <span className="body-sm text-[var(--color-text-secondary)]">
                          Günlük Kişi Başı
                        </span>
                      </div>
                      <div className="h2 text-[var(--color-accent-mint)]">
                        {result.data.gunluk_kisi_maliyeti || "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={scaleIn}>
                  <Card hoverable variant="elevated" className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[var(--color-accent-blue)]/20">
                          <Calculator className="w-6 h-6 text-[var(--color-accent-blue)]" />
                        </div>
                        <span className="body-sm text-[var(--color-text-secondary)]">
                          Toplam Gider
                        </span>
                      </div>
                      <div className="h2 text-[var(--color-accent-blue)]">
                        {result.data.tahmini_toplam_gider || "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={scaleIn}>
                  <Card hoverable variant="elevated" className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[var(--color-accent-purple)]/20">
                          <TrendingUp className="w-6 h-6 text-[var(--color-accent-purple)]" />
                        </div>
                        <span className="body-sm text-[var(--color-text-secondary)]">
                          Karlılık Oranı
                        </span>
                      </div>
                      <div className="h2 text-[var(--color-accent-purple)]">
                        {result.data.onerilen_karlilik_orani || "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Cost Distribution */}
              {result.data.maliyet_dagilimi && (
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Maliyet Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(result.data.maliyet_dagilimi).map(
                        ([key, value]) => (
                          <motion.div
                            key={key}
                            whileHover={{ scale: 1.05 }}
                            className="glass-subtle p-5 rounded-xl text-center"
                          >
                            <div className="h3 text-[var(--color-accent-blue)] mb-2">
                              {value}
                            </div>
                            <div className="body-sm text-[var(--color-text-secondary)] capitalize">
                              {key.replace("_", " ")}
                            </div>
                          </motion.div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Items */}
              {result.data.riskli_kalemler &&
                result.data.riskli_kalemler.length > 0 && (
                  <Card variant="elevated" className="border border-[var(--color-accent-red)]/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-[var(--color-accent-red)]" />
                        <CardTitle>Riskli Kalemler</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.data.riskli_kalemler.map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3 glass-subtle p-4 rounded-xl border border-[var(--color-accent-red)]/20"
                          >
                            <div className="p-2 rounded-lg bg-[var(--color-accent-red)]/20">
                              <AlertTriangle className="w-5 h-5 text-[var(--color-accent-red)]" />
                            </div>
                            <span className="body text-[var(--color-text-primary)]">{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Optimization Suggestions */}
              {result.data.optimizasyon_onerileri &&
                result.data.optimizasyon_onerileri.length > 0 && (
                  <Card variant="elevated" className="border border-[var(--color-accent-mint)]/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-[var(--color-accent-gold)]" />
                        <CardTitle>Optimizasyon Önerileri</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.data.optimizasyon_onerileri.map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-start gap-3 glass-subtle p-4 rounded-xl border border-[var(--color-accent-mint)]/20"
                          >
                            <div className="p-2 rounded-lg bg-[var(--color-accent-mint)]/20 flex-shrink-0">
                              <Lightbulb className="w-5 h-5 text-[var(--color-accent-mint)]" />
                            </div>
                            <span className="body text-[var(--color-text-primary)] flex-1">{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Meta Info */}
              {result.meta && (
                <Card variant="subtle">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-[var(--color-accent-blue)]" />
                      <CardTitle>Analiz Bilgileri</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="info">Süre</Badge>
                        <span className="body font-mono text-[var(--color-accent-blue)]">
                          {result.meta.duration_ms} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Model</Badge>
                        <span className="body text-[var(--color-accent-mint)]">
                          {result.meta.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Token</Badge>
                        <span className="body font-mono text-[var(--color-text-secondary)]">
                          ~{result.meta.estimated_tokens}
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
          {result && !result.success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[var(--color-accent-red)]/20">
                      <AlertTriangle className="w-8 h-8 text-[var(--color-accent-red)]" />
                    </div>
                    <div>
                      <h3 className="h3 text-[var(--color-accent-red)] mb-2">Hata Oluştu</h3>
                      <p className="body text-[var(--color-text-secondary)]">{result.error}</p>
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
