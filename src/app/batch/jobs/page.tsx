"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface BatchJob {
  id: string;
  user_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: "high" | "normal" | "low";
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  updated_at: string;
  error: string | null;
}

function BatchJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlight");

  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchJobs = async () => {
    try {
      const url = filter === "all"
        ? "/api/batch/jobs"
        : `/api/batch/jobs?status=${filter}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setJobs(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: BatchJob["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case "cancelled":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: BatchJob["status"]) => {
    const colors = {
      pending: "bg-gray-500/20 text-gray-300",
      processing: "bg-blue-500/20 text-blue-300",
      completed: "bg-green-500/20 text-green-300",
      failed: "bg-red-500/20 text-red-300",
      cancelled: "bg-yellow-500/20 text-yellow-300",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: BatchJob["priority"]) => {
    const colors = {
      high: "bg-red-500/20 text-red-300",
      normal: "bg-blue-500/20 text-blue-300",
      low: "bg-gray-500/20 text-gray-300",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getProgress = (job: BatchJob) => {
    if (job.total_files === 0) return 0;
    return Math.round((job.processed_files / job.total_files) * 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="h1">Toplu İşlem Geçmişi</h1>
          <p className="text-gray-400 mt-2">
            Tüm batch işlemlerinizi takip edin
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Toplam", value: jobs.length, icon: FileText, color: "indigo" },
            {
              label: "İşleniyor",
              value: jobs.filter((j) => j.status === "processing").length,
              icon: Loader2,
              color: "blue",
            },
            {
              label: "Tamamlandı",
              value: jobs.filter((j) => j.status === "completed").length,
              icon: CheckCircle2,
              color: "green",
            },
            {
              label: "Başarısız",
              value: jobs.filter((j) => j.status === "failed").length,
              icon: XCircle,
              color: "red",
            },
          ].map((stat, i) => (
            <div key={i} className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 text-${stat.color}-400`} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card mb-6">
          <div className="flex gap-2">
            {["all", "pending", "processing", "completed", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800/50 text-gray-400 hover:bg-slate-700/50"
                }`}
              >
                {status === "all" ? "Tümü" : status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card mb-6 border-2 border-red-500/50 bg-red-500/10">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Jobs Table */}
        <div className="glass-card">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Henüz işlem yok</p>
              <button
                onClick={() => router.push("/batch")}
                className="btn-gradient mt-4 px-6 py-2 rounded-lg"
              >
                Yeni İşlem Başlat
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      İşlem ID
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Durum
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Öncelik
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      İlerleme
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Dosyalar
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Tarih
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className={`border-b border-gray-800 hover:bg-slate-800/50 transition-colors ${
                        highlightId === job.id ? "bg-indigo-500/10" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="font-mono text-sm">
                            {job.id.slice(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4">{getPriorityBadge(job.priority)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 w-24">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all"
                              style={{ width: `${getProgress(job)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">
                            {getProgress(job)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {job.processed_files}/{job.total_files}
                          {job.failed_files > 0 && (
                            <span className="text-red-400 ml-1">
                              ({job.failed_files} failed)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-400">
                          {formatDate(job.created_at)}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => router.push(`/batch/jobs/${job.id}`)}
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                          Detay →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BatchJobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <BatchJobsContent />
    </Suspense>
  );
}