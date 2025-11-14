"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Calculator, Info, Lightbulb, TrendingUp, ArrowLeft, ArrowRight, FileText, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePipelineStore, PIPELINE_STEPS } from "@/store/usePipelineStore";
import { PipelineNavigator } from "@/components/ui/PipelineNavigator";

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

  const router = useRouter();
  const {
    selectedTender,
    menuData,
    setCostAnalysis,
    setCurrentStep,
    markStepCompleted,
    getProgress
  } = usePipelineStore();

  // Store'dan gelen verileri kullan
  const [input, setInput] = useState({
    kurum: "",
    ihale_turu: "",
    kisilik: "",
    butce: "",
  });

  useEffect(() => {
    setCurrentStep(PIPELINE_STEPS.COST_ANALYSIS);

    // Auto-fill from pipeline store
    if (selectedTender) {
      setInput(prev => ({
        ...prev,
        kurum: (selectedTender as any).kurum || selectedTender.organization || prev.kurum,
        ihale_turu: (selectedTender as any).ihale_turu || selectedTender.tenderType || prev.ihale_turu,
        butce: (selectedTender as any).butce || (selectedTender as any).budget || prev.butce,
      }));
    }

    if (menuData && menuData.length > 0) {
      const kisiSayisi = menuData[0]?.kisi || 0;
      if (kisiSayisi > 0) {
        setInput(prev => ({
          ...prev,
          kisilik: kisiSayisi.toString()
        }));
      }
    }
  }, [setCurrentStep, selectedTender, menuData]);

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

      // Store'a kaydet
      if (data.success && data.data) {
        setCostAnalysis(data.data);
        markStepCompleted(PIPELINE_STEPS.COST_ANALYSIS);
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

  return (
    <motion.div
      className="min-h-screen p-6 md:p-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-7xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Pipeline İlerlemesi</span>
            <span>{getProgress()}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              // Dynamic progress width requires inline style
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Selected Tender and Menu Info */}
        {selectedTender && (
          <div className="glass-card p-4 mb-6 bg-gradient-to-r from-indigo-500/10 to-transparent border-indigo-500/30">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-400">Seçili İhale</p>
                <p className="font-medium text-white">
                  {(selectedTender as any).kurum || selectedTender.organization} - {(selectedTender as any).ihale_no || selectedTender.id}
                </p>
                {menuData && menuData.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {menuData.length} menü kalemi yüklendi • Toplam {menuData.reduce((sum, item) => sum + item.gramaj, 0).toLocaleString('tr-TR')} gram
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/menu-robot')}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Menü Sayfasına Dön</span>
          </button>

          {result?.success && result?.data && (
            <button
              onClick={() => {
                setCurrentStep(PIPELINE_STEPS.DECISION);
                router.push('/decision');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 transition-all group"
            >
              <span className="font-medium">Karar Analizine Geç</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Selected Tender & Menu Info */}
        {selectedTender && (
          <div className="glass-card mb-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Seçili İhale</p>
                <p className="text-sm font-semibold text-white">{selectedTender.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedTender.organization} • {selectedTender.city}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Menü Bilgisi</p>
                <p className="text-sm font-semibold text-white">
                  {menuData?.length || 0} Yemek • {menuData?.[0]?.kisi || 0} Kişi
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Toplam: {menuData?.reduce((sum, item) => sum + item.gramaj, 0) || 0}g
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-8 flex items-center gap-4">
          <motion.div
            className="p-4 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Calculator className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI Maliyet Analiz Motoru
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Claude Sonnet 4.5 ile akıllı maliyet hesaplama ve optimizasyon
            </p>
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
                        <div className="p-2 rounded-lg bg-[(--color-accent-mint)]/20">
                          <TrendingUp className="w-6 h-6 text-[(--color-accent-mint)]" />
                        </div>
                        <span className="body-sm text-[(--color-text-secondary)]">
                          Günlük Kişi Başı
                        </span>
                      </div>
                      <div className="h2 text-[(--color-accent-mint)]">
                        {result.data.gunluk_kisi_maliyeti || "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={scaleIn}>
                  <Card hoverable variant="elevated" className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[(--color-accent-blue)]/20">
                          <Calculator className="w-6 h-6 text-[(--color-accent-blue)]" />
                        </div>
                        <span className="body-sm text-[(--color-text-secondary)]">
                          Toplam Gider
                        </span>
                      </div>
                      <div className="h2 text-[(--color-accent-blue)]">
                        {result.data.tahmini_toplam_gider || "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={scaleIn}>
                  <Card hoverable variant="elevated" className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[(--color-accent-purple)]/20">
                          <TrendingUp className="w-6 h-6 text-[(--color-accent-purple)]" />
                        </div>
                        <span className="body-sm text-[(--color-text-secondary)]">
                          Karlılık Oranı
                        </span>
                      </div>
                      <div className="h2 text-[(--color-accent-purple)]">
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
                            <div className="h3 text-[(--color-accent-blue)] mb-2">
                              {value}
                            </div>
                            <div className="body-sm text-[(--color-text-secondary)] capitalize">
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
                  <Card variant="elevated" className="border border-[(--color-accent-red)]/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-[(--color-accent-red)]" />
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
                            className="flex items-center gap-3 glass-subtle p-4 rounded-xl border border-[(--color-accent-red)]/20"
                          >
                            <div className="p-2 rounded-lg bg-[(--color-accent-red)]/20">
                              <AlertTriangle className="w-5 h-5 text-[(--color-accent-red)]" />
                            </div>
                            <span className="body text-[(--color-text-primary)]">{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Optimization Suggestions */}
              {result.data.optimizasyon_onerileri &&
                result.data.optimizasyon_onerileri.length > 0 && (
                  <Card variant="elevated" className="border border-[(--color-accent-mint)]/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-[(--color-accent-gold)]" />
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
                            className="flex items-start gap-3 glass-subtle p-4 rounded-xl border border-[(--color-accent-mint)]/20"
                          >
                            <div className="p-2 rounded-lg bg-[(--color-accent-mint)]/20 shrink-0">
                              <Lightbulb className="w-5 h-5 text-[(--color-accent-mint)]" />
                            </div>
                            <span className="body text-[(--color-text-primary)] flex-1">{item}</span>
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
                      <Info className="w-5 h-5 text-[(--color-accent-blue)]" />
                      <CardTitle>Analiz Bilgileri</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="info">Süre</Badge>
                        <span className="body font-mono text-[(--color-accent-blue)]">
                          {result.meta.duration_ms} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Model</Badge>
                        <span className="body text-[(--color-accent-mint)]">
                          {result.meta.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="neutral">Token</Badge>
                        <span className="body font-mono text-[(--color-text-secondary)]">
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
              <Card className="border border-[(--color-accent-red)]/30 bg-[(--color-accent-red)]/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[(--color-accent-red)]/20">
                      <AlertTriangle className="w-8 h-8 text-[(--color-accent-red)]" />
                    </div>
                    <div>
                      <h3 className="h3 text-[(--color-accent-red)] mb-2">Hata Oluştu</h3>
                      <p className="body text-[(--color-text-secondary)]">{result.error}</p>
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
            currentStep="cost"
            enableNext={result?.success === true}
            onNext={() => {
              if (result) {
                setCostAnalysis(result.data as any);
                markStepCompleted(PIPELINE_STEPS.COST_ANALYSIS);
                router.push('/decision');
              }
            }}
          />

          {/* Quick Action to Decision */}
          {result?.success && (
            <button
              onClick={() => {
                setCostAnalysis(result.data as any);
                markStepCompleted(PIPELINE_STEPS.COST_ANALYSIS);
                router.push('/decision');
              }}
              className="w-full mt-4 px-6 py-3 btn-gradient rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Karar Verme Aşamasına Geç
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
