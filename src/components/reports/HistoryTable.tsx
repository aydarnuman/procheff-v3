"use client";

import { Download, CheckCircle, XCircle, Clock } from "lucide-react";


interface HistoryItem {
  id: number;
  template_name: string;
  file_path: string;
  file_size: number;
  sizeFormatted: string;
  generation_time: number;
  status: "success" | "failed" | "partial";
  error_message?: string;
  generated_at: string;
  fileExists: boolean;
  downloadUrl?: string;
}

interface HistoryTableProps {
  history: HistoryItem[];
  onDownload: (item: HistoryItem) => void;
}

export function HistoryTable({ history, onDownload }: HistoryTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Başarılı";
      case "failed":
        return "Başarısız";
      case "partial":
        return "Kısmi";
      default:
        return status;
    }
  };

  if (history.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Henüz rapor üretilmemiş</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-4 font-medium text-gray-300">Şablon</th>
              <th className="text-left p-4 font-medium text-gray-300">Tarih</th>
              <th className="text-left p-4 font-medium text-gray-300">Boyut</th>
              <th className="text-left p-4 font-medium text-gray-300">Süre</th>
              <th className="text-left p-4 font-medium text-gray-300">Durum</th>
              <th className="text-center p-4 font-medium text-gray-300">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <div className="font-medium">{item.template_name}</div>
                    <div className="text-xs text-gray-500">
                      {item.file_path.split("/").pop()}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  {new Date(item.generated_at).toLocaleString("tr-TR")}
                </td>
                <td className="p-4 text-sm">{item.sizeFormatted}</td>
                <td className="p-4 text-sm">
                  {(item.generation_time / 1000).toFixed(2)}s
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className="text-sm">{getStatusText(item.status)}</span>
                  </div>
                  {item.error_message && (
                    <div className="text-xs text-red-400 mt-1">
                      {item.error_message}
                    </div>
                  )}
                </td>
                <td className="p-4 text-center">
                  {item.fileExists && item.downloadUrl ? (
                    <button
                      onClick={() => onDownload(item)}
                      className="p-2 glass hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">İndir</span>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Dosya yok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}