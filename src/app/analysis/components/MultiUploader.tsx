'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { motion, AnimatePresence } from 'framer-motion';

interface FilePreview {
  file: File;
  id: string;
  preview?: string;
  type: 'pdf' | 'word' | 'excel' | 'zip' | 'text' | 'other';
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

export function MultiUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { startNewAnalysis } = useAnalysisStore();

  const getFileType = (file: File): FilePreview['type'] => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.type;

    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime?.includes('word') || ext === 'docx' || ext === 'doc') return 'word';
    if (mime?.includes('sheet') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'excel';
    if (mime === 'application/zip' || ext === 'zip') return 'zip';
    if (mime?.startsWith('text/') || ext === 'txt') return 'text';
    return 'other';
  };

  const getFileIcon = (type: FilePreview['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
      case 'zip':
        return <FileArchive className="w-5 h-5 text-yellow-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    // Check rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(r => {
        if (r.file.size > MAX_FILE_SIZE) {
          return `${r.file.name} çok büyük (max 50MB)`;
        }
        return `${r.file.name} desteklenmiyor`;
      });
      setError(errors.join(', '));
      return;
    }

    // Check total size
    const currentSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const newSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);

    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      setError('Toplam dosya boyutu 200MB\'ı aşamaz');
      return;
    }

    // Add files
    const newFiles: FilePreview[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: getFileType(file)
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/zip': ['.zip'],
      'text/plain': ['.txt'],
      'text/html': ['.html']
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Lütfen en az bir dosya seçin');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((filePreview, index) => {
        formData.append(`file${index}`, filePreview.file);
      });

      // Start analysis in store
      const analysisId = startNewAnalysis(files.map(f => f.file));

      // Upload files
      const response = await fetch('/api/analysis/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Yükleme başarısız');
      }

      // Navigate to analysis result page
      router.push(`/analysis/${data.analysisId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setUploading(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Upload className="w-10 h-10 text-indigo-400" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragActive ? 'Dosyaları buraya bırakın' : 'İhale Dosyalarını Yükleyin'}
          </h3>

          <p className="text-slate-400 mb-4 max-w-md">
            PDF, Word, Excel, ZIP dosyalarınızı sürükleyip bırakın veya seçmek için tıklayın
          </p>

          <div className="flex gap-2 flex-wrap justify-center">
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">PDF</span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">DOCX</span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">XLSX</span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">ZIP</span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">TXT</span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">CSV</span>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Max 50MB/dosya • Toplam max 200MB
          </p>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Yüklenen Dosyalar ({files.length})
              </h3>
              <p className="text-sm text-slate-400">
                Toplam: {formatFileSize(totalSize)}
              </p>
            </div>
            <button
              onClick={clearAll}
              className="text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              Tümünü Temizle
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {files.map((filePreview) => (
                <motion.div
                  key={filePreview.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg group hover:bg-slate-800/60 transition-colors"
                >
                  {getFileIcon(filePreview.type)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {filePreview.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(filePreview.file.size)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFile(filePreview.id)}
                    className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Upload Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className={`
                flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all
                ${uploading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/30'
                }
              `}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analiz Başlatılıyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analizi Başlat</span>
                </>
              )}
            </button>
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Yükleniyor...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}