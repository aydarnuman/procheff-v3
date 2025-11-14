"use client";

import { useState, useEffect } from "react";
import { Database, Trash2, Download, HardDrive } from "lucide-react";

export default function DatabaseSettingsPage() {
  const [dbSize, setDbSize] = useState("0 MB");
  const [logCount, setLogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/database/stats");
      const data = await res.json();

      if (data.success) {
        setDbSize(data.stats.dbSize);
        setLogCount(data.stats.logCount);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVacuum = async () => {
    try {
      setActionLoading("vacuum");
      const res = await fetch("/api/database/vacuum", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert("✅ " + data.message);
        fetchStats();
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Database optimize edilemedi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    if (confirm("Eski kayıtlar silinecek. Emin misiniz?")) {
      try {
        setActionLoading("cleanup");
        const res = await fetch("/api/database/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days: 30 })
        });
        const data = await res.json();

        if (data.success) {
          alert("✅ " + data.message);
          fetchStats();
        } else {
          alert("❌ " + data.error);
        }
      } catch (error) {
        alert("❌ Temizlik başarısız");
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleBackup = async () => {
    try {
      setActionLoading("backup");
      const res = await fetch("/api/database/backup");

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `procheff-backup-${new Date().toISOString()}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert("✅ Yedek indirildi");
      } else {
        alert("❌ Yedek indirilemedi");
      }
    } catch (error) {
      alert("❌ Yedek indirilemedi");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Veritabanı Ayarları</h1>

      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Database İstatistikleri</h3>
          {loading ? (
            <p className="text-gray-400">Yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-lg">
                <p className="text-sm text-gray-400">Boyut</p>
                <p className="text-2xl font-bold mt-1">{dbSize}</p>
              </div>
              <div className="glass p-4 rounded-lg">
                <p className="text-sm text-gray-400">Log Sayısı</p>
                <p className="text-2xl font-bold mt-1">{logCount}</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Bakım İşlemleri</h3>
          <div className="space-y-3">
            <button
              onClick={handleVacuum}
              disabled={actionLoading === "vacuum"}
              className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <div className="flex-1 text-left">
                <p className="font-semibold">
                  {actionLoading === "vacuum" ? "Optimize ediliyor..." : "Optimize Et (VACUUM)"}
                </p>
                <p className="text-sm text-gray-400">
                  Database boyutunu küçült ve performansı artır
                </p>
              </div>
            </button>

            <button
              onClick={handleCleanup}
              disabled={actionLoading === "cleanup"}
              className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
              <div className="flex-1 text-left">
                <p className="font-semibold">
                  {actionLoading === "cleanup" ? "Temizleniyor..." : "Eski Kayıtları Sil"}
                </p>
                <p className="text-sm text-gray-400">
                  30 gün önceki logları temizle
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Yedekleme</h3>
          <button
            onClick={handleBackup}
            disabled={actionLoading === "backup"}
            className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 text-green-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold">
                {actionLoading === "backup" ? "İndiriliyor..." : "Yedek Al"}
              </p>
              <p className="text-sm text-gray-400">
                Tüm veritabanını indir
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
