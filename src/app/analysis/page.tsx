"use client";

import { useState } from "react";
import { Upload, FileText, Brain, Utensils, Calculator, Zap, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type AnalysisType = "auto" | "menu" | "cost" | "decision" | null;

interface UploadFile {
  file: File;
  preview?: string;
}

export default function AnalysisHub() {
  const router = useRouter();
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatch, setIsBatch] = useState(false);

  const analysisTypes = [
    {
      id: "auto" as AnalysisType,
      name: "Oto Analiz",
      icon: Zap,
      description: "Hızlı ve otomatik ihale analizi - AI destekli karar",
      color: "from-yellow-500 to-orange-600",
    },
    {
      id: "menu" as AnalysisType,
      name: "Menü Parser",
      icon: Utensils,
      description: "Menü ve yemek listelerini analiz et",
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "cost" as AnalysisType,
      name: "Maliyet Analizi",
      icon: Calculator,
      description: "Detaylı maliyet hesaplama ve karşılaştırma",
      color: "from-blue-500 to-cyan-600",
    },
    {
      id: "decision" as AnalysisType,
      name: "Karar Desteği",
      icon: Brain,
      description: "AI destekli stratejik karar analizi",
      color: "from-purple-500 to-pink-600",
    },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({ file }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = selectedFiles.map(file => ({ file }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const startAnalysis = async () => {
    if (!analysisType || files.length === 0) return;

    // Route to appropriate analysis endpoint
    const formData = new FormData();
    files.forEach(({ file }) => formData.append("file", file));
    formData.append("analysisType", analysisType);
    formData.append("batch", String(isBatch));

    try {
      const endpoint = isBatch ? "/api/batch/upload" : "/api/orchestrate/jobs";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to results or history
        if (isBatch) {
          router.push("/analysis/history");
        } else {
          router.push(`/analysis/results/${data.jobId}`);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            İhale Analiz Merkezi
          </h1>
          <p className="text-xl text-gray-400">
            Tüm analiz ihtiyaçlarınız için tek platform
          </p>
        </motion.div>

        {/* Analysis Type Selection */}
        {!analysisType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {analysisTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAnalysisType(type.id)}
                  className="glass-card p-8 text-center group hover:border-indigo-500/50 transition-all relative overflow-hidden"
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                  {/* Icon */}
                  <div className="relative mb-4 flex justify-center">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} p-0.5`}>
                      <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>
                  <p className="text-sm text-gray-400">{type.description}</p>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Selected Type Header */}
              <div className="flex items-center justify-between glass-card p-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const type = analysisTypes.find(t => t.id === analysisType);
                    if (!type) return null;
                    const Icon = type.icon;
                    return (
                      <>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{type.name}</h3>
                          <p className="text-sm text-gray-400">{type.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => { setAnalysisType(null); setFiles([]); }}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  Değiştir
                </button>
              </div>

              {/* Batch Toggle */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="font-semibold text-white">Toplu İşlem Modu</p>
                    <p className="text-sm text-gray-400">Birden fazla dosyayı aynı anda işle</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBatch}
                    onChange={(e) => setIsBatch(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* File Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`glass-card p-12 text-center border-2 border-dashed transition-all ${
                  isDragging ? "border-indigo-500 bg-indigo-500/5" : "border-gray-700"
                }`}
              >
                <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? "text-indigo-400" : "text-gray-500"}`} />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {files.length > 0 ? `${files.length} dosya seçildi` : "Dosyaları buraya sürükleyin"}
                </h3>
                <p className="text-gray-400 mb-4">veya</p>
                <label className="btn-gradient px-6 py-3 rounded-xl cursor-pointer inline-block">
                  Dosya Seç
                  <input
                    type="file"
                    multiple={isBatch}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-4">PDF, DOCX, TXT dosyaları desteklenir</p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="glass-card p-6">
                  <h4 className="font-semibold text-white mb-4">Seçilen Dosyalar</h4>
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-400" />
                          <span className="text-gray-300">{f.file.name}</span>
                        </div>
                        <button
                          onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Analysis Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={files.length === 0}
                onClick={startAnalysis}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg shadow-2xl shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Analizi Başlat
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
