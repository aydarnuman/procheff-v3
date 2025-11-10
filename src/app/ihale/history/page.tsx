"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, CheckCircle2, Loader2 } from "lucide-react";

// Gün farkı hesaplama
function getDaysRemaining(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

// Renk belirleme
function getUrgencyColor(days: number | null): { bg: string; text: string; border: string; label: string } {
  if (days === null || days < 0) return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Geçti' };
  if (days === 0) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: 'BUGÜN!' };
  if (days === 1) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '1 gün' };
  if (days === 2) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '2 gün' };
  if (days === 3) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '3 gün' };
  if (days === 4) return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', label: '4 gün' };
  if (days === 5) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '5 gün' };
  if (days === 6) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '6 gün' };
  if (days === 7) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '7 gün' };
  return { bg: 'bg-transparent', text: 'text-gray-400', border: 'border-transparent', label: `${days} gün` };
}

interface IhaleHistoryItem {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  ihale_tarihi?: string;
}

export default function IhaleHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<IhaleHistoryItem[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch from /api/ihale/history
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 3); // 3 gün sonrası (test için)

    setHistory([
      {
        id: '1',
        filename: 'ihale-2025-001.pdf',
        status: 'completed',
        created_at: new Date().toISOString(),
        ihale_tarihi: testDate.toISOString(),
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">İhale Geçmişi</h1>

        <div className="glass-card">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-sm">Henüz analiz yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 bg-slate-900/30">
                    <th className="text-center px-3 py-3 text-xs font-semibold text-indigo-400 whitespace-nowrap">Aciliyet</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-indigo-400">Dosya</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-indigo-400 whitespace-nowrap">İhale Tarihi</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-indigo-400 whitespace-nowrap">Analiz Tarihi</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-indigo-400">Durum</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-indigo-400">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => {
                    const daysRemaining = getDaysRemaining(item.ihale_tarihi);
                    const urgency = getUrgencyColor(daysRemaining);
                    const isLoading = loadingItemId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-800 hover:bg-slate-800/50 transition-colors ${
                          index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                        }`}
                      >
                        {/* Aciliyet Badge */}
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center">
                            {daysRemaining !== null && daysRemaining <= 7 ? (
                              <span className={`
                                px-2 py-1 rounded-md text-[10px] font-bold
                                border whitespace-nowrap
                                ${urgency.bg} ${urgency.text} ${urgency.border}
                                animate-pulse
                              `}>
                                {urgency.label}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-xs text-white">{item.filename}</td>

                        <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {item.ihale_tarihi ? new Date(item.ihale_tarihi).toLocaleDateString('tr-TR') : '-'}
                        </td>

                        <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString('tr-TR')}
                        </td>

                        <td className="px-3 py-2.5">
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                            Tamamlandı
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setLoadingItemId(item.id)}
                            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Yükleniyor...</span>
                              </>
                            ) : (
                              <>
                                Detay →
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
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
