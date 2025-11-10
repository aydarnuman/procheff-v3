"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

export default function ReportSettingsPage() {
  const [config, setConfig] = useState({
    template: "modern",
    language: "tr",
    includeCharts: true,
  });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Rapor Ayarları</h1>
      
      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Şablon</h3>
          <div className="grid grid-cols-3 gap-4">
            {["modern", "classic", "minimal"].map((t) => (
              <button
                key={t}
                onClick={() => setConfig({ ...config, template: t })}
                className={`glass p-4 rounded-lg ${config.template === t ? 'border-2 border-indigo-500' : ''}`}
              >
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="capitalize">{t}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Dil</h3>
          <select
            value={config.language}
            onChange={(e) => setConfig({ ...config, language: e.target.value })}
            className="glass p-3 rounded-lg w-full bg-transparent text-white"
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>

        <button className="btn-gradient w-full py-3 rounded-lg font-semibold">
          Kaydet
        </button>
      </div>
    </div>
  );
}
