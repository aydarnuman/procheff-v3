'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Table2, FileSpreadsheet, Download } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';
import { modalBackdrop, modalContent } from '@/lib/utils/animation-variants';

type ExportFormat = 'pdf' | 'excel' | 'word';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  title?: string;
}

interface ExportOptions {
  includeCharts?: boolean;
  includeRawData?: boolean;
  includeAnalysis?: boolean;
  watermark?: boolean;
  template?: string;
}

export function ExportDialog({ isOpen, onClose, onExport, title = 'Analiz Sonuçları' }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [options, setOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeRawData: false,
    includeAnalysis: true,
    watermark: false,
    template: 'professional'
  });
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    {
      id: 'pdf' as ExportFormat,
      name: 'PDF',
      description: 'Profesyonel rapor',
      icon: FileText,
      color: 'text-red-400',
      features: ['Logo', 'İmza alanı', 'Sayfa numaraları']
    },
    {
      id: 'excel' as ExportFormat,
      name: 'Excel',
      description: 'Detaylı hesaplamalar',
      icon: Table2,
      color: 'text-green-400',
      features: ['Formüller', 'Tablolar', 'Grafikler']
    },
    {
      id: 'word' as ExportFormat,
      name: 'Word',
      description: 'Düzenlenebilir döküman',
      icon: FileSpreadsheet,
      color: 'text-blue-400',
      features: ['Düzenlenebilir', 'Şablonlar', 'Yorum ekleme']
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, options);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{title} - Export</h2>
                  <p className="text-slate-400 text-sm mt-1">Dosya formatı ve ayarları seçin</p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-slate-400" />
                </motion.button>
              </div>

              {/* Format Selection */}
              <div className="space-y-4 mb-6">
                <h3 className="text-white font-semibold">Format Seçimi</h3>
                <div className="grid grid-cols-3 gap-3">
                  {formats.map((format) => {
                    const Icon = format.icon;
                    const isSelected = selectedFormat === format.id;

                    return (
                      <motion.button
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`
                          p-4 rounded-xl border-2 transition-all text-left
                          ${isSelected
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                          }
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${format.color}`} />
                        <h4 className="text-white font-semibold mb-1">{format.name}</h4>
                        <p className="text-slate-400 text-xs mb-2">{format.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {format.features.slice(0, 2).map((feature, i) => (
                            <Badge key={i} variant="default" size="sm">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-4 mb-6">
                <h3 className="text-white font-semibold">İçerik Ayarları</h3>
                <div className="space-y-2">
                  <CheckboxOption
                    label="Grafikleri dahil et"
                    checked={options.includeCharts || false}
                    onChange={(checked) => setOptions({ ...options, includeCharts: checked })}
                  />
                  <CheckboxOption
                    label="Ham veriyi dahil et"
                    checked={options.includeRawData || false}
                    onChange={(checked) => setOptions({ ...options, includeRawData: checked })}
                  />
                  <CheckboxOption
                    label="Analiz özetini dahil et"
                    checked={options.includeAnalysis || false}
                    onChange={(checked) => setOptions({ ...options, includeAnalysis: checked })}
                  />
                  <CheckboxOption
                    label="Taslak filigranı ekle"
                    checked={options.watermark || false}
                    onChange={(checked) => setOptions({ ...options, watermark: checked })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  İptal
                </motion.button>
                <motion.button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isExporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dışa aktarılıyor...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      {selectedFormat.toUpperCase()} İndir
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
      />
      <span className="text-slate-300 text-sm">{label}</span>
    </label>
  );
}
