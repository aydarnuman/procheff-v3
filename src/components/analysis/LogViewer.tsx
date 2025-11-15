"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: number;
  level: string;
  message: string;
  data: string;
  created_at: string;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/logs");
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.logs);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch logs");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "info":
        return "text-cyan-400";
      case "success":
        return "text-green-400";
      case "warn":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return "ℹ️";
      case "success":
        return "✅";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "📝";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("tr-TR");
    } catch (error) {
      return dateString;
    }
  };

  const parseData = (data: string) => {
    try {
      return JSON.parse(data);
    } catch (error) {
      return data;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
          <p className="text-slate-400">Loglar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-900 rounded-lg border border-red-900/50">
        <div className="flex items-center gap-3 text-red-400">
          <span className="text-2xl">❌</span>
          <div>
            <p className="font-semibold">Hata</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          📜 Sistem Günlüğü
        </h2>
        <button
          onClick={fetchLogs}
          className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
        >
          🔄 Yenile
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Henüz log kaydı yok</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-slate-800/50 rounded border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getLevelIcon(log.level)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold uppercase ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{log.message}</p>
                  {log.data && log.data !== "{}" && (
                    <pre className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(parseData(log.data), null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
