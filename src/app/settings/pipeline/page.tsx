"use client";

import { useState } from "react";
import { Settings, Clock, RefreshCw } from "lucide-react";

export default function PipelineSettingsPage() {
  const [config, setConfig] = useState({
    maxRetries: 2,
    timeout: 60,
    concurrentJobs: 3,
    autoExport: true,
  });

  const handleSave = async () => {
    // TODO: Save to backend
    alert("Ayarlar kaydedildi!");
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Pipeline Ayarları</h1>

      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Yeniden Deneme</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Maksimum Deneme Sayısı
              </label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) =>
                  setConfig({ ...config, maxRetries: parseInt(e.target.value) })
                }
                className="glass p-3 rounded-lg w-full bg-transparent text-white"
                min="1"
                max="5"
              />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Zaman Aşımı</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Timeout (saniye)
              </label>
              <input
                type="number"
                value={config.timeout}
                onChange={(e) =>
                  setConfig({ ...config, timeout: parseInt(e.target.value) })
                }
                className="glass p-3 rounded-lg w-full bg-transparent text-white"
                min="30"
                max="300"
              />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Paralel İşlem</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Eşzamanlı İş Sayısı
              </label>
              <input
                type="number"
                value={config.concurrentJobs}
                onChange={(e) =>
                  setConfig({ ...config, concurrentJobs: parseInt(e.target.value) })
                }
                className="glass p-3 rounded-lg w-full bg-transparent text-white"
                min="1"
                max="10"
              />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Otomatik İşlemler</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoExport}
              onChange={(e) =>
                setConfig({ ...config, autoExport: e.target.checked })
              }
              className="w-5 h-5"
            />
            <span>Otomatik PDF/Excel Export</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          className="btn-gradient w-full py-3 rounded-lg font-semibold"
        >
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
}
