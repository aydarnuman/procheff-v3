"use client";

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
    Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

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
  const esRef = useRef<EventSource | null>(null);

  function listen(id: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/orchestrate/jobs/${id}/events`);

    es.onmessage = (e) => {
      try {
        const ev: EventData = JSON.parse(e.data);

        if (typeof ev.progress === "number") {
          setProgress(ev.progress);
        }

        if (ev.step) {
          setActiveStep(ev.step);

          if (ev.step === "done") {
            setIsProcessing(false);
          } else if (ev.step === "error") {
            setIsProcessing(false);
            setError(ev.error || "Bilinmeyen hata");
          }
        }

        if (ev.message) {
          setStatus(ev.message);
        }

        if (ev.result) {
          setResult(ev.result);
        }

        if (ev.error) {
          setError(ev.error);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsProcessing(false);
    };

    esRef.current = es;
  }

  async function start() {
    if (!file) return;

    // Reset state
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("Başlatılıyor...");
    setActiveStep("init");
    setIsProcessing(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!data?.jobId) {
        setStatus("Hata: jobId alınamadı");
        setIsProcessing(false);
        return;
      }

      listen(data.jobId);
    } catch (err) {
      setStatus("Hata: " + (err instanceof Error ? err.message : String(err)));
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
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
              className="p-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] shadow-glow-blue"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="h1">Tek Tıkla Otomatik Analiz</h1>
                <Badge variant="warning" pulse>NEW</Badge>
              </div>
              <p className="body text-[var(--color-text-secondary)]">
                Upload → OCR → Deep → Cost → Decision → Report
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          {/* File Input */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <label className="flex-1 w-full">
                  <motion.div
                    className="glass-subtle p-5 rounded-xl hover:glass transition-all cursor-pointer border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]"
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
                      <Upload className="w-6 h-6 text-[var(--color-accent-blue)]" />
                      <span className="body text-[var(--color-text-primary)]">
                        {file ? file.name : "Dosya seç (PDF, DOCX, TXT, CSV)"}
                      </span>
                    </div>
                  </motion.div>
                </label>

                <Button
                  onClick={start}
                  disabled={!file || isProcessing}
                  variant="primary"
                  size="lg"
                  loading={isProcessing}
                  icon={isProcessing ? <Loader2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  className="whitespace-nowrap"
                >
                  {isProcessing ? "İşleniyor..." : "Başlat"}
                </Button>
              </div>
            </CardContent>
          </Card>
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
              <Card variant="elevated">
                <CardContent className="p-6">
                  <div className="relative h-4 bg-[var(--color-surface)] rounded-full overflow-hidden mb-3 border border-[var(--color-border)]">
                    <motion.div
                      className="absolute left-0 top-0 h-4 bg-gradient-to-r from-[var(--color-accent-blue)] via-[var(--color-accent-purple)] to-[var(--color-accent-mint)] shadow-glow-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body text-[var(--color-text-secondary)]">{status}</span>
                    <Badge variant="info">{progress}%</Badge>
                  </div>
                </CardContent>
              </Card>
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
              <Card className="border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-accent-red)]/20">
                      <span className="text-xl">❌</span>
                    </div>
                    <div>
                      <h3 className="h4 text-[var(--color-accent-red)] mb-1">Hata Oluştu</h3>
                      <p className="body-sm text-[var(--color-text-secondary)]">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                        flex flex-col items-center gap-3 rounded-xl p-4 border transition-all
                        ${
                          active
                            ? "border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 shadow-glow-blue"
                            : done
                            ? "border-[var(--color-accent-mint)]/30 bg-[var(--color-accent-mint)]/5"
                            : "border-[var(--color-border)] glass-subtle"
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
                              ? "bg-[var(--color-accent-blue)]/20"
                              : done
                              ? "bg-[var(--color-accent-mint)]/20"
                              : "bg-[var(--color-surface)]"
                          }
                        `}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            active
                              ? "text-[var(--color-accent-blue)]"
                              : done
                              ? "text-[var(--color-accent-mint)]"
                              : "text-[var(--color-text-tertiary)]"
                          }`}
                        />
                      </motion.div>
                      <span className="body-sm text-center font-medium">{s.label}</span>
                      {done && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-mint)]" />
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
              <Card
                variant="elevated"
                className="border border-[var(--color-accent-mint)]/40 shadow-glow-mint"
              >
                <CardHeader className="border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="p-3 rounded-xl bg-[var(--color-accent-mint)]/20"
                    >
                      <CheckCircle2 className="w-7 h-7 text-[var(--color-accent-mint)]" />
                    </motion.div>
                    <div>
                      <CardTitle>Analiz Tamamlandı</CardTitle>
                      <p className="body-sm text-[var(--color-text-secondary)] mt-1">
                        Tüm sonuçlar başarıyla oluşturuldu
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <motion.div
                    className="grid md:grid-cols-3 gap-5 mb-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {/* Analysis */}
                    <motion.div variants={scaleIn}>
                      <Card hoverable className="h-full">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-lg bg-[var(--color-accent-blue)]/20">
                              <span className="text-xl">📊</span>
                            </div>
                            <h3 className="h4 text-[var(--color-accent-blue)]">Analiz</h3>
                          </div>
                          <pre className="body-sm text-[var(--color-text-secondary)] max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                            {JSON.stringify(result.analysis, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Cost */}
                    <motion.div variants={scaleIn}>
                      <Card hoverable className="h-full">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-lg bg-[var(--color-accent-purple)]/20">
                              <span className="text-xl">💰</span>
                            </div>
                            <h3 className="h4 text-[var(--color-accent-purple)]">Maliyet</h3>
                          </div>
                          <pre className="body-sm text-[var(--color-text-secondary)] max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                            {JSON.stringify(result.cost, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Decision */}
                    <motion.div variants={scaleIn}>
                      <Card hoverable className="h-full">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-lg bg-[var(--color-accent-mint)]/20">
                              <span className="text-xl">🧠</span>
                            </div>
                            <h3 className="h4 text-[var(--color-accent-mint)]">Karar</h3>
                          </div>
                          <pre className="body-sm text-[var(--color-text-secondary)] max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                            {JSON.stringify(result.decision, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>

                  {/* Download Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--color-border)]">
                    {result.pdfPath && (
                      <motion.a
                        href={result.pdfPath}
                        download
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="primary"
                          size="lg"
                          icon={<FileDown className="w-5 h-5" />}
                          className="bg-gradient-to-r from-[var(--color-accent-mint)] to-emerald-600"
                        >
                          PDF İndir
                        </Button>
                      </motion.a>
                    )}
                    {result.xlsxPath && (
                      <motion.a
                        href={result.xlsxPath}
                        download
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="primary"
                          size="lg"
                          icon={<FileSpreadsheet className="w-5 h-5" />}
                          className="bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]"
                        >
                          Excel İndir
                        </Button>
                      </motion.a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
