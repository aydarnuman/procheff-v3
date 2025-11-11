/**
 * ExportButtons - Reusable export button group
 */

import { useState } from 'react';
import { Download, FileText, Table, Loader2 } from 'lucide-react';

interface Props {
  analysisId?: string;
  tenderId?: string;
  type: 'analysis' | 'tender';
}

export function ExportButtons({ analysisId, tenderId, type }: Props) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);

    try {
      const id = analysisId || tenderId;
      if (!id) {
        throw new Error('ID gerekli');
      }

      const endpoint = type === 'analysis'
        ? `/api/export/${format}?analysisId=${id}`
        : `/api/ihale/export-${format === 'excel' ? 'xlsx' : 'pdf'}/${id}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Export başarısız: ${response.statusText}`);
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error instanceof Error ? error.message : 'Export başarısız');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400 mr-2">Export:</span>

      {/* PDF Button */}
      <button
        onClick={() => handleExport('pdf')}
        disabled={exporting !== null}
        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400
          rounded-lg transition-colors flex items-center gap-2 text-sm
          disabled:opacity-50 disabled:cursor-not-allowed"
        title="PDF olarak indir"
      >
        {exporting === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span>PDF</span>
      </button>

      {/* Excel Button */}
      <button
        onClick={() => handleExport('excel')}
        disabled={exporting !== null}
        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400
          rounded-lg transition-colors flex items-center gap-2 text-sm
          disabled:opacity-50 disabled:cursor-not-allowed"
        title="Excel olarak indir"
      >
        {exporting === 'excel' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Table className="w-4 h-4" />
        )}
        <span>Excel</span>
      </button>
    </div>
  );
}
