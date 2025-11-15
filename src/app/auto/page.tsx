"use client";

import { LiveLogFeed } from "@/components/pipeline/LiveLogFeed";
import { PipelineTimeline, TimelineStep } from "@/components/pipeline/PipelineTimeline";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Calculator,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type EventData = {
  step?: string;
  progress?: number;
  message?: string;
  result?: {
    analysis?: unknown;
    cost?: unknown;
    decision?: unknown;
    pdfPath?: string | null;
    xlsxPath?: string | null;
  };
  error?: string;
};

const STEPS = [
  { key: "upload", label: "Yükleme", icon: Upload },
  { key: "ocr", label: "OCR / Extract", icon: FileText },
  { key: "deep", label: "Derin Analiz", icon: Brain },
  { key: "cost", label: "Maliyet", icon: Calculator },
  { key: "decision", label: "Karar", icon: Brain },
  { key: "report", label: "Raporlar", icon: FileDown },
  { key: "done", label: "Tamamlandı", icon: CheckCircle2 },
];

export default function AutoPipelinePage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Hazır");
  const [activeStep, setActiveStep] = useState<string>("init");
  const [result, setResult] = useState<EventData["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([
    { id: "upload", name: "Dosya Yükleme", status: "pending" },
    { id: "ocr", name: "OCR / Text Extraction", status: "pending" },
    { id: "deep", name: "Derin Analiz (Claude)", status: "pending" },
    { id: "cost", name: "Maliyet Hesaplama", status: "pending" },
    { id: "decision", name: "Karar Motoru", status: "pending" },
    { id: "report", name: "Rapor Oluşturma", status: "pending" },
  ]);
  const esRef = useRef<EventSource | null>(null);

  // SSE Listener
  function listen(id: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/orchestrate/jobs/${id}/events`);
    setJobId(id);

    es.onmessage = (e) => {
      try {
        const ev: EventData = JSON.parse(e.data);

        if (typeof ev.progress === "number") setProgress(ev.progress);
        if (ev.step) {
          setActiveStep(ev.step);
          
          // Update timeline
          setTimelineSteps((prev) =>
            prev.map((step) => {
              const stepKey = step.id;
              if (stepKey === ev.step) {
                return { ...step, status: "running" as const, timestamp: new Date().toISOString() };
              }
              // Mark previous steps as completed
              const currentIndex = STEPS.findIndex((s) => s.key === ev.step);
              const stepIndex = STEPS.findIndex((s) => s.key === stepKey);
              if (stepIndex < currentIndex && step.status !== "completed") {
                return { ...step, status: "completed" as const };
              }
              return step;
            })
          );

          if (ev.step === "done") {
            setIsProcessing(false);
            setTimelineSteps((prev) =>
              prev.map((step) => ({ ...step, status: "completed" as const }))
            );
            toast.success("🎉 Analiz tamamlandı! PDF ve Excel hazır.");
          } else if (ev.step === "error") {
            setIsProcessing(false);
            setTimelineSteps((prev) =>
              prev.map((step) =>
                step.status === "running"
                  ? { ...step, status: "failed" as const, error: ev.error }
                  : step
              )
            );
            setError(ev.error || "Bilinmeyen hata oluştu");
            toast.error(ev.error || "Analiz başarısız");
          }
        }
        if (ev.message) setStatus(ev.message);
        if (ev.result) setResult(ev.result);
      } catch (error) {
        console.error("SSE parse error:", error);
      }
    };

    es.onerror = () => {
      es.close();
      setIsProcessing(false);
      toast.warning("Bağlantı koptu, yeniden bağlanılıyor...");
      setTimeout(() => listen(id), 2000); // Auto-reconnect
    };

    esRef.current = es;
  }

  // Start analysis
  async function start() {
    if (!file) return;
    if (!file.name.match(/\.(pdf|docx|txt|csv)$/i)) {
      toast.error("❌ Geçersiz dosya formatı. Sadece PDF, DOCX, TXT veya CSV yükleyin.");
      return;
    }

    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("Başlatılıyor...");
    setActiveStep("init");
    setIsProcessing(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/orchestrate", { method: "POST", body: fd });
      const data = await res.json();

      if (!data?.jobId) {
        setStatus("Hata: jobId alınamadı");
        setIsProcessing(false);
        toast.error("Job ID alınamadı, işlem başlatılamadı.");
        return;
      }

      localStorage.setItem("lastJobId", data.jobId);
      listen(data.jobId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setStatus("Hata: " + msg);
      setIsProcessing(false);
      toast.error("İşlem başlatılırken hata oluştu: " + msg);
    }
  }

  // Auto-resume
  useEffect(() => {
    const lastJob = localStorage.getItem("lastJobId");
    if (lastJob && !isProcessing) {
      toast.info("Önceki analiz devam ediyor, bağlantı yeniden kuruluyor...");
      listen(lastJob);
      setIsProcessing(true);
    }
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.main
      className="min-h-screen p-6 md:p-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <motion.div
              className="p-4 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
                İhale Dökümanı Analizi
              </h1>
              <p className="text-sm text-gray-400">
                Dosyanızı yükleyin, AI otomatik analiz edip rapor üretsin
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          {/* File Input */}
          <div className="glass-card mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="flex-1 w-full">
                <motion.div
                  className="glass-subtle p-5 rounded-xl hover:bg-white/10 transition-all cursor-pointer border border-white/10 hover:border-indigo-500/50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-indigo-400" />
                    <span className="text-sm text-white">
                      {file ? file.name : "Dosya seç (PDF, DOCX, TXT, CSV)"}
                    </span>
                  </div>
                </motion.div>
              </label>

              <motion.button
                onClick={start}
                disabled={!file || isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gradient px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>İşleniyor...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Başlat</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="glass-card">
                <div className="relative h-4 bg-slate-900/50 rounded-full overflow-hidden mb-3 border border-white/10">
                  <motion.div
                    className="absolute left-0 top-0 h-4 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{status}</span>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-semibold">
                    {progress}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6"
            >
              <div className="glass-card border border-red-500/30 bg-red-500/5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <span className="text-xl">❌</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-400 mb-1">Hata Oluştu</h3>
                    <p className="text-sm text-gray-400">{error}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline Steps */}
        <AnimatePresence>
          {(isProcessing || result) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-8"
            >
              <motion.div
                className="grid grid-cols-2 md:grid-cols-7 gap-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {STEPS.map((s, index) => {
                  const Icon = s.icon;
                  const active = s.key === activeStep;
                  const done =
                    STEPS.findIndex((x) => x.key === activeStep) >
                    STEPS.findIndex((x) => x.key === s.key);

                  return (
                    <motion.div
                      key={s.key}
                      variants={scaleIn}
                      custom={index}
                      whileHover={{ scale: 1.05 }}
                      className={`
                        flex flex-col items-center gap-3 rounded-xl p-4 border transition-all relative
                        ${
                          active
                            ? "border-indigo-500 bg-indigo-500/10 shadow-lg"
                            : done
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-white/10 glass-subtle"
                        }
                      `}
                    >
                      <motion.div
                        animate={active ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: active ? Infinity : 0, repeatDelay: 1 }}
                        className={`
                          p-2 rounded-lg
                          ${
                            active
                              ? "bg-indigo-500/20"
                              : done
                              ? "bg-emerald-500/20"
                              : "bg-slate-800/50"
                          }
                        `}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            active
                              ? "text-indigo-400"
                              : done
                              ? "text-emerald-400"
                              : "text-gray-500"
                          }`}
                        />
                      </motion.div>
                      <span className="text-xs text-center font-medium text-white">{s.label}</span>
                      {done && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Display */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4, type: 'spring' }}
            >
              <div className="glass-card border border-emerald-500/40 shadow-lg">
                <div className="border-b border-white/10 pb-6 mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="p-3 rounded-xl bg-emerald-500/20"
                    >
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </motion.div>
                    <div>
                      <h2 className="h2">Analiz Tamamlandı</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Tüm sonuçlar başarıyla oluşturuldu
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <motion.div
                    className="grid md:grid-cols-3 gap-5 mb-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {/* Analysis */}
                    <motion.div variants={scaleIn}>
                      <div className="glass-card h-full hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-indigo-500/20">
                            <span className="text-xl">📊</span>
                          </div>
                          <h3 className="text-sm font-semibold text-indigo-400">Analiz</h3>
                        </div>
                        <pre className="text-xs text-gray-400 max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded-lg border border-white/10">
                          {JSON.stringify(result.analysis, null, 2)}
                        </pre>
                      </div>
                    </motion.div>

                    {/* Cost */}
                    <motion.div variants={scaleIn}>
                      <div className="glass-card h-full hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <span className="text-xl">💰</span>
                          </div>
                          <h3 className="text-sm font-semibold text-purple-400">Maliyet</h3>
                        </div>
                        <pre className="text-xs text-gray-400 max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded-lg border border-white/10">
                          {JSON.stringify(result.cost, null, 2)}
                        </pre>
                      </div>
                    </motion.div>

                    {/* Decision */}
                    <motion.div variants={scaleIn}>
                      <div className="glass-card h-full hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <span className="text-xl">🧠</span>
                          </div>
                          <h3 className="text-sm font-semibold text-emerald-400">Karar</h3>
                        </div>
                        <pre className="text-xs text-gray-400 max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded-lg border border-white/10">
                          {JSON.stringify(result.decision, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Download Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                    {result.pdfPath && (
                      <motion.a
                        href={result.pdfPath}
                        download
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-block"
                      >
                        <button className="btn-gradient px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                          <FileDown className="w-5 h-5" />
                          PDF İndir
                        </button>
                      </motion.a>
                    )}
                    {result.xlsxPath && (
                      <motion.a
                        href={result.xlsxPath}
                        download
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-block"
                      >
                        <button className="bg-linear-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all">
                          <FileSpreadsheet className="w-5 h-5" />
                          Excel İndir
                        </button>
                      </motion.a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline & Log Feed Section */}
        <AnimatePresence>
          {isProcessing && jobId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6"
            >
              {/* Pipeline Timeline */}
              <motion.div variants={fadeInUp} className="order-1">
                <div className="glass-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-white">Pipeline Timeline</h3>
                  </div>
                  <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                    <PipelineTimeline steps={timelineSteps} currentStep={activeStep} />
                  </div>
                </div>
              </motion.div>

              {/* Live Log Feed */}
              <motion.div variants={fadeInUp} className="order-2">
                <div className="glass-card h-[400px] sm:h-[500px]">
                  <LiveLogFeed jobId={jobId} maxLogs={15} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
