"use client";

import { MultiUploader } from "./components/MultiUploader";
import { motion } from "framer-motion";
import { FileSearch, Brain, TrendingUp, FileText, Sparkles, Shield, Clock, Target } from "lucide-react";

export default function AnalysisPage() {
  const features = [
    {
      icon: FileSearch,
      title: "Akıllı Doküman İşleme",
      description: "PDF, Word, Excel dosyalarından otomatik veri çıkarma",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Brain,
      title: "Derin Analiz",
      description: "Claude AI ile uzman seviyesinde strateji ve karar üretimi",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Piyasa Entegrasyonu",
      description: "Gerçek zamanlı fiyat analizi ve maliyet tahmini",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Shield,
      title: "Risk Değerlendirmesi",
      description: "Operasyonel, finansal ve zaman risklerinin analizi",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Target,
      title: "İzlenebilirlik",
      description: "Her analiz cümlesi için kaynak referansı",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Clock,
      title: "Hızlı Sonuç",
      description: "5 dakika içinde tam kapsamlı analiz",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const workflow = [
    { step: 1, name: "Yükleme", description: "Dosyaları yükleyin" },
    { step: 2, name: "Çıkarma", description: "Veri havuzu oluşturma" },
    { step: 3, name: "Analiz", description: "AI ile değerlendirme" },
    { step: 4, name: "Sonuç", description: "Karar ve strateji" }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
        </div>

        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          İhale Analiz Sistemi
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Tüm ihale dokümanlarınızı yükleyin, AI otomatik analiz etsin ve uzman seviyesinde karar üretsin
        </p>
      </motion.div>

      {/* Workflow Steps */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          {workflow.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-1 text-center"
            >
              <div className="relative">
                {index < workflow.length - 1 && (
                  <div className="absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                  {item.step}
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-white">{item.name}</h3>
              <p className="text-sm text-slate-400">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-16">
        <MultiUploader />
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-center text-white mb-8"
        >
          Sistem Özellikleri
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-6 hover:border-indigo-500/50 transition-all group"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto mt-16 glass-card p-8 border-indigo-500/30"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <FileText className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Desteklenen Dosya Formatları
            </h3>
            <p className="text-slate-400 mb-4">
              Sistem şu dosya formatlarını destekler:
            </p>
            <div className="flex flex-wrap gap-2">
              {['PDF', 'DOCX', 'XLSX', 'ZIP', 'TXT', 'CSV', 'HTML'].map(format => (
                <span
                  key={format}
                  className="px-3 py-1 bg-slate-800/50 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700"
                >
                  {format}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-4">
              • Maksimum dosya boyutu: 50MB/dosya
              <br />
              • Toplam maksimum boyut: 200MB
              <br />
              • ZIP dosyaları otomatik açılır
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}