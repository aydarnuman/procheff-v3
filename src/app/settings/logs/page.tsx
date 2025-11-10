import LogViewer from "@/components/analysis/LogViewer";

export default function LogsPage() {
  return (
    <div className="min-h-screen">
      <div className="space-y-8">
        <div>
          <h1 className="h1">
            🔍 Sistem Logları
          </h1>
          <p className="text-slate-400">
            Claude Sonnet 4.5 analiz logları ve performans metrikleri
          </p>
        </div>
        
        <LogViewer />

        <div className="glass-card">
          <h3 className="h3 mb-4">
            📊 Log Metrikleri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-800/50 rounded">
              <div className="text-cyan-400 font-semibold mb-1">ℹ️ INFO</div>
              <div className="text-slate-400">Sistem bilgilendirmeleri</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <div className="text-green-400 font-semibold mb-1">✅ SUCCESS</div>
              <div className="text-slate-400">Başarılı işlemler</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <div className="text-red-400 font-semibold mb-1">❌ ERROR</div>
              <div className="text-slate-400">Hata kayıtları</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
