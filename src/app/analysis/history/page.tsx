"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, CheckCircle2, XCircle, Loader2, Filter, Search, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { SkeletonTable } from "@/components/ui/Skeleton";

interface AnalysisHistoryItem {
  id: string;
  filename: string;
  analysisType: "auto" | "menu" | "cost" | "decision";
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
}

const analysisTypeLabels = {
  auto: "Oto Analiz",
  menu: "Menü Parser",
  cost: "Maliyet",
  decision: "Karar Desteği",
};

export default function AnalysisHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual API endpoint
      // Combine data from /api/auto/history, /api/batch/jobs, etc.
      const response = await fetch(`/api/analysis/history?status=${filter}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      // Mock data for now
      setHistory([
        {
          id: "1",
          filename: "ihale-2025-001.pdf",
          analysisType: "auto",
          status: "completed",
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysisTypeLabels[item.analysisType].toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Bekliyor",
      class: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    },
    processing: {
      icon: Loader2,
      label: "İşleniyor",
      class: "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse",
    },
    completed: {
      icon: CheckCircle2,
      label: "Tamamlandı",
      class: "bg-green-500/20 text-green-300 border-green-500/30",
    },
    failed: {
      icon: XCircle,
      label: "Başarısız",
      class: "bg-red-500/20 text-red-300 border-red-500/30",
    },
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="h1 mb-8">Analiz Geçmişi</h1>
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="h1 mb-2">Analiz Geçmişi</h1>
          <p className="text-gray-400">Tüm analiz işlemlerinizi buradan takip edebilirsiniz</p>
        </motion.div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Dosya adı veya analiz tipi ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            {["all", "pending", "processing", "completed", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "Tümü" : statusConfig[status as keyof typeof statusConfig].label}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="glass-card overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">
                {searchQuery ? "Arama sonucu bulunamadı" : "Henüz analiz yok"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-semibold text-gray-300">Dosya</th>
                    <th className="text-left p-4 font-semibold text-gray-300">Analiz Tipi</th>
                    <th className="text-left p-4 font-semibold text-gray-300">Durum</th>
                    <th className="text-left p-4 font-semibold text-gray-300">Tarih</th>
                    <th className="text-left p-4 font-semibold text-gray-300">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, index) => {
                    const StatusIcon = statusConfig[item.status].icon;
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-800 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <span className="text-white">{item.filename}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300">
                            {analysisTypeLabels[item.analysisType]}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${statusConfig[item.status].class}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig[item.status].label}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(item.created_at).toLocaleString("tr-TR")}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => router.push(`/analysis/results/${item.id}`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Detay
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
