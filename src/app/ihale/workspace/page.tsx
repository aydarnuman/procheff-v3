"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type JobEvent = {
  status?: string;
  progress?: number;
  result?: unknown;
  error?: string;
};

export default function WorkspacePage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Hazır");
  const [result, setResult] = useState<unknown>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  async function handleUpload() {
    if (!file) return;
    
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("Yükleniyor...");
    setCelebrate(false);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ihale/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!data.success) {
        setStatus("Hata: " + data.error);
        setError(data.error);
        return;
      }

      setJobId(data.jobId);
      listenJob(data.jobId);
      setStatus("Analiz Başladı");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Bilinmeyen hata";
      setStatus("Hata: " + errorMsg);
      setError(errorMsg);
    }
  }

  function listenJob(id: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/ihale/jobs/${id}/events`);
    
    es.onmessage = (e) => {
      const data: JobEvent = JSON.parse(e.data);
      if (data.progress != null) setProgress(data.progress);
      if (data.status) setStatus(getStatusText(data.status));
      if (data.result) {
        setResult(data.result);
        setStatus("Tamamlandı");
        setCelebrate(true);
      }
      if (data.error) {
        setStatus("Hata: " + data.error);
        setError(data.error);
      }
    };

    es.onerror = () => {
      setStatus("Bağlantı hatası");
      setError("Sunucu bağlantısı kesildi");
      es.close();
    };

    esRef.current = es;
  }

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  // Kutlama efekti - progress %100'e ulaşınca tetikle
  useEffect(() => {
    if (progress === 100 && !celebrate) {
      const triggerTimer = setTimeout(() => setCelebrate(true), 50);
      // 3 saniye sonra kutlamayı kapat
      const clearTimer = setTimeout(() => setCelebrate(false), 3000);
      return () => {
        clearTimeout(triggerTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [progress, celebrate]);

  const icons: Record<string, React.ReactElement> = {
    idle: <Upload className="w-6 h-6 text-slate-400" />,
    uploading: <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />,
    extract: <FileText className="w-6 h-6 text-emerald-400 animate-pulse" />,
    ocr: <FileText className="w-6 h-6 text-yellow-400 animate-pulse" />,
    analyze: <Brain className="w-6 h-6 text-purple-400 animate-pulse" />,
    done: <CheckCircle2 className="w-6 h-6 text-green-400" />,
    error: <AlertCircle className="w-6 h-6 text-red-400" />,
  };

  function getColor(): string {
    if (error || status.includes("Hata")) return "from-red-600 to-rose-500";
    if (status === "Tamamlandı" || progress === 100)
      return "from-emerald-500 to-green-400";
    return "from-indigo-600 to-purple-600";
  }

  function getStatusKey(statusText: string, progressValue: number): string {
    if (error || statusText.includes("Hata")) return "error";
    if (statusText.includes("extract") || statusText.includes("Çıkar"))
      return "extract";
    if (statusText.includes("ocr") || statusText.includes("OCR")) return "ocr";
    if (statusText.includes("analyze") || statusText.includes("Analiz"))
      return "analyze";
    if (progressValue === 100 || statusText === "Tamamlandı") return "done";
    if (statusText.includes("Yükleniyor")) return "uploading";
    return "idle";
  }

  function getStatusText(statusCode: string): string {
    const statusMap: Record<string, string> = {
      pending: "Bekliyor...",
      processing: "İşleniyor...",
      extract: "Metin Çıkarılıyor...",
      ocr: "OCR İşleniyor (Gemini Vision)...",
      analyze: "Claude Analiz Ediyor...",
      completed: "Tamamlandı",
      error: "Hata Oluştu",
    };
    return statusMap[statusCode] || statusCode;
  }

  return (
    <main className="relative min-h-screen p-6 md:p-10">
      {/* 🎉 Kutlama efekti - analiz tamamlandığında */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.6, 0.4, 0], 
              scale: [0.8, 1.2, 1.5, 2] 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(circle at center, rgba(34,197,94,0.5), rgba(16,185,129,0.3) 40%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="p-4 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              İhale Analiz Workspace
            </h1>
            <p className="text-sm text-gray-400 mt-1">Gemini Vision OCR + Claude Sonnet 4.5</p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* File Input */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex-1">
              <label htmlFor="ihale-document-upload" className="block text-sm text-gray-400 mb-2">
                İhale Dokümanı Seçin (PDF, DOCX, TXT)
              </label>
              <input
                id="ihale-document-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 cursor-pointer border border-white/10 rounded-lg bg-slate-900/50 px-3 py-2"
                aria-label="İhale dokümanı yükle"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-500">
                  Seçili: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <motion.button
              onClick={handleUpload}
              disabled={!file || (jobId !== null && progress > 0 && progress < 100)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-gradient px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {file ? "Yükle ve Analiz Et" : "Dosya Seç"}
            </motion.button>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-4 bg-slate-900/50 rounded-full overflow-hidden mb-4 border border-white/10">
            <motion.div
              className={`h-4 bg-linear-to-r ${getColor()} shadow-lg`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mb-6">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {icons[getStatusKey(status, progress)]}
              <p className="text-sm text-gray-300 font-medium">{status}</p>
            </motion.div>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-semibold">
              {progress}%
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="glass-card border border-red-500/30 bg-red-500/5 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-sm text-red-300 font-medium">Hata: {error}</p>
              </div>
            </motion.div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result ? (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-card border border-emerald-500/30 bg-emerald-500/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="p-3 rounded-xl bg-emerald-500/20"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </motion.div>
                  <h2 className="h2">Analiz Sonucu</h2>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto bg-slate-900/50 p-4 rounded-lg border border-white/10 mb-4">
                  {typeof result === 'object' && result !== null 
                    ? JSON.stringify(result, null, 2) 
                    : String(result)}
                </pre>
                <div className="flex gap-3 flex-wrap">
                  <motion.a
                    href="/cost-analysis"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-linear-to-r from-emerald-500 to-green-400 text-white font-semibold rounded-xl px-5 py-2.5 hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    💰 Maliyet Analizi
                  </motion.a>
                  <motion.a
                    href="/decision"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-linear-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl px-5 py-2.5 hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    🎯 Karar Motoru
                  </motion.a>
                  <motion.a
                    href="/reports"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-linear-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl px-5 py-2.5 hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    📊 Rapor Oluştur
                  </motion.a>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* Info Card */}
        <motion.div
          className="mt-6 glass-card bg-indigo-500/5 border-indigo-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <p className="text-sm text-indigo-200 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              <strong>İpucu:</strong> Sistem otomatik olarak doküman tipini
              algılar, gerekirse OCR ile metin çıkarır ve Claude Sonnet 4.5 ile
              analiz eder. Tüm işlemler gerçek zamanlı izlenir.
            </span>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
