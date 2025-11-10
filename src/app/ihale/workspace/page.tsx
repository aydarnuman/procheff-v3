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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
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
    <main className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-gray-100 p-10">
      {/* 🌌 Arka plan partikül efekti */}
      <motion.div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.2), transparent 50%)",
          backgroundSize: "cover",
        }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror" }}
      />

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

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.h1
          className="text-4xl font-bold mb-8 flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="text-indigo-400 w-10 h-10" />
          İhale Analiz Workspace
        </motion.h1>

        {/* Main Card - Glassmorphism efekti */}
        <motion.div
          className="bg-slate-900/50 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl hover:shadow-indigo-500/10 transition-shadow duration-500"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* File Input */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-2">
                İhale Dokümanı Seçin (PDF, DOCX, TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-900 file:text-indigo-100 hover:file:bg-indigo-800 cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-slate-500">
                  Seçili: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || (jobId !== null && progress > 0 && progress < 100)}
                            className="bg-linear-to-r from-indigo-500 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {file ? "Yükle ve Analiz Et" : "Dosya Seç"}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-4 shadow-inner">
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
            <p className="text-sm text-gray-400 font-semibold">{progress}%</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">Hata: {error}</p>
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
                className="bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/10"
              >
                <h2 className="text-xl mb-3 font-semibold text-indigo-300 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  🧾 Analiz Sonucu
                </h2>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  {typeof result === 'object' && result !== null 
                    ? JSON.stringify(result, null, 2) 
                    : String(result)}
                </pre>
                <div className="mt-4 flex gap-3 flex-wrap">
                  <a
                    href="/cost-analysis"
                    className="bg-linear-to-r from-emerald-500 to-green-400 hover:from-green-400 hover:to-emerald-500 text-slate-900 font-semibold rounded-lg px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-emerald-500/50"
                  >
                    💰 Maliyet Analizi
                  </a>
                  <a
                    href="/decision"
                    className="bg-linear-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-600 text-slate-100 font-semibold rounded-lg px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                  >
                    🎯 Karar Motoru
                  </a>
                  <a
                    href="/reports"
                    className="bg-linear-to-r from-cyan-500 to-blue-500 hover:from-blue-500 hover:to-cyan-600 text-slate-100 font-semibold rounded-lg px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
                  >
                    📊 Rapor Oluştur
                  </a>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* Info Card - Glassmorphism */}
        <motion.div
          className="mt-6 bg-indigo-900/20 backdrop-blur-sm border border-indigo-700/50 rounded-lg p-4 hover:bg-indigo-900/30 transition-colors duration-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <p className="text-sm text-indigo-200">
            <strong>💡 İpucu:</strong> Sistem otomatik olarak doküman tipini
            algılar, gerekirse OCR ile metin çıkarır ve Claude Sonnet 4.5 ile
            analiz eder. Tüm işlemler gerçek zamanlı izlenir.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
