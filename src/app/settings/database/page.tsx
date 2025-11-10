"use client";

import { useState } from "react";
import { Database, Trash2, Download, HardDrive } from "lucide-react";

export default function DatabaseSettingsPage() {
  const [dbSize, setDbSize] = useState("2.4 MB");
  const [logCount, setLogCount] = useState(1523);

  const handleVacuum = async () => {
    alert("Database optimize ediliyor...");
  };

  const handleCleanup = async () => {
    if (confirm("Eski kayıtlar silinecek. Emin misiniz?")) {
      alert("Temizlik başlatıldı!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Veritabanı Ayarları</h1>

      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Database İstatistikleri</h3>
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
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Bakım İşlemleri</h3>
          <div className="space-y-3">
            <button
              onClick={handleVacuum}
              className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3"
            >
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <div className="flex-1 text-left">
                <p className="font-semibold">Optimize Et (VACUUM)</p>
                <p className="text-sm text-gray-400">
                  Database boyutunu küçült ve performansı artır
                </p>
              </div>
            </button>

            <button
              onClick={handleCleanup}
              className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
              <div className="flex-1 text-left">
                <p className="font-semibold">Eski Kayıtları Sil</p>
                <p className="text-sm text-gray-400">
                  30 gün önceki logları temizle
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Yedekleme</h3>
          <button className="glass w-full p-4 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-3">
            <Download className="w-5 h-5 text-green-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold">Yedek Al</p>
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
