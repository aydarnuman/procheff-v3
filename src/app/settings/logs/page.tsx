import LogViewer from "@/components/analysis/LogViewer";

export default function LogsPage() {
  return (
    <div className="min-h-screen">
      <div className="space-y-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Sistem Logları
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Claude Sonnet 4.5 analiz logları ve performans metrikleri
            </p>
          </div>
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
