"use client";

import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    FileSpreadsheet,
    FileText,
    RefreshCw,
    XCircle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface OrchestrationRecord {
  id: string;
  file_name: string | null;
  file_size: number | null;
  status: string;
  progress: number;
  current_step: string | null;
  warnings: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function PipelineHistoryPage() {
  const [jobs, setJobs] = useState<OrchestrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);

      const res = await fetch(`/api/orchestrate/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm("Bu job'ı silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/orchestrate/jobs/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        fetchHistory(); // Refresh list
      } else {
        alert("Silme hatası: " + data.error);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Silme başarısız");
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === "all") return true;
    return job.status === filter;
  });

  const statusIcon = {
    completed: <CheckCircle className="h-5 w-5 text-emerald-400" />,
    failed: <XCircle className="h-5 w-5 text-red-400" />,
    done_with_warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
    running: <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />,
    pending: <Clock className="h-5 w-5 text-gray-400" />,
  };

  const statusBadge = {
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    done_with_warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    running: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    pending: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Pipeline History
          </h1>
          <p className="text-gray-400">
            View all past pipeline executions and their results
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === "completed"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter("done_with_warning")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === "done_with_warning"
                ? "bg-yellow-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            With Warnings
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === "failed"
                ? "bg-red-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            Failed
          </button>
          <button
            onClick={() => setFilter("running")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === "running"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            Running
          </button>

          <button
            onClick={fetchHistory}
            className="ml-auto rounded-lg bg-slate-800/50 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-slate-800"
          >
            <RefreshCw className="inline-block h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No pipeline executions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800 bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      File
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Duration
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredJobs.map((job, index) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-200">
                            {job.file_name || "Unknown"}
                          </div>
                          {job.file_size && (
                            <div className="text-xs text-gray-500">
                              {(job.file_size / 1024).toFixed(1)} KB
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {statusIcon[job.status as keyof typeof statusIcon]}
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              statusBadge[
                                job.status as keyof typeof statusBadge
                              ]
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        {job.warnings && (
                          <div className="mt-1 text-xs text-yellow-400">
                            {JSON.parse(job.warnings).length} warning(s)
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                        {job.duration_ms
                          ? `${(job.duration_ms / 1000).toFixed(1)}s`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {job.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/auto?jobId=${job.id}`}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            View Details
                          </Link>
                          {job.status === "completed" && (
                            <>
                              <button className="rounded-lg bg-slate-700 p-1.5 text-gray-300 hover:bg-slate-600">
                                <FileText className="h-4 w-4" />
                              </button>
                              <button className="rounded-lg bg-slate-700 p-1.5 text-gray-300 hover:bg-slate-600">
                                <FileSpreadsheet className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
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
