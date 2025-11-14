'use client';

import { useToast } from '@/contexts/ToastContext';
import { AILogger } from '@/lib/ai/logger';
import { AIDocumentDetector, type SmartDetection } from '@/lib/ai/smart-detection';
import type { DataPool } from '@/lib/document-processor/types';
import { ChunkUploader } from '@/lib/utils/chunk-upload';
import { useAnalysisStore } from '@/store/analysisStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Cloud,
    Database,
    Eye,
    FileCode,
    FileText,
    Folder,
    Loader2,
    Search,
    Tag,
    Upload,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { IhaleSelector } from './IhaleSelector';

// File types configuration
const FILE_TYPES = {
  'application/pdf': { icon: '📄', color: 'red', label: 'PDF', gradient: 'from-red-500 to-red-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', color: 'blue', label: 'DOCX', gradient: 'from-blue-500 to-blue-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', color: 'green', label: 'XLSX', gradient: 'from-green-500 to-green-600' },
  'text/csv': { icon: '📈', color: 'yellow', label: 'CSV', gradient: 'from-yellow-500 to-yellow-600' },
  'text/plain': { icon: '📃', color: 'gray', label: 'TXT', gradient: 'from-gray-500 to-gray-600' },
  'application/json': { icon: '{}', color: 'purple', label: 'JSON', gradient: 'from-purple-500 to-purple-600' },
  'image/png': { icon: '🖼️', color: 'pink', label: 'PNG', gradient: 'from-pink-500 to-pink-600' },
  'image/jpeg': { icon: '🖼️', color: 'pink', label: 'JPEG', gradient: 'from-pink-500 to-pink-600' },
  'application/zip': { icon: '📦', color: 'orange', label: 'ZIP', gradient: 'from-orange-500 to-orange-600' },
  'application/x-zip-compressed': { icon: '📦', color: 'orange', label: 'ZIP', gradient: 'from-orange-500 to-orange-600' },
};

// Processing stages
const STAGES = [
  { id: 'upload', icon: Upload, label: 'Yükleniyor', description: 'Dosya sunucuya aktarılıyor' },
  { id: 'parse', icon: FileCode, label: 'Ayrıştırma', description: 'Dosya yapısı analiz ediliyor' },
  { id: 'extract', icon: Database, label: 'Veri Çıkarma', description: 'İçerik ve tablolar çıkarılıyor' },
  { id: 'analyze', icon: Brain, label: 'AI Analizi', description: 'Yapay zeka analizi (Gemini OCR + Claude)' },
  { id: 'complete', icon: CheckCircle2, label: 'Tamamlandı', description: 'İşlem başarıyla tamamlandı' }
];

const DOCUMENT_LABEL_MAP: Record<SmartDetection['documentType'], string> = {
  'İhale İlanı': 'İhale İlanı',
  'İdari Şartname': 'İdari Şartname',
  'Teknik Şartname': 'Teknik Şartname',
  Zeyilname: 'Zeyilname',
  'Sözleşme Taslağı': 'Sözleşme Taslağı',
  'Teklif Evrakı': 'Teklif Evrakı',
  Fatura: 'Fatura',
  Sözleşme: 'Sözleşme',
  Menü: 'Menü Planı',
  Rapor: 'Rapor',
  Teklif: 'Teklif',
  Diğer: 'Genel Doküman'
};

interface FileMetrics {
  tables: number;
  amounts: number;
  entities: number;
  words: number;
  dates: number;
  confidence: number;
  pages?: number;
  language?: string;
  categories?: string[];
}

interface FileItem {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'parsing' | 'extracting' | 'analyzing' | 'complete' | 'error';
  progress: number;
  stage: number;
  metrics: FileMetrics | null;
  error: string | null;
  startTime: number;
  endTime: number | null;
  dataPool: unknown | null;
  preview?: string;
  smartDetection?: SmartDetection;
  isLargeFile?: boolean;
  chunkUploadId?: string;
  folderName?: string;
}

export function UltimateFileUploader() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const filesRef = useRef<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fileHashes, setFileHashes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderMapRef = useRef<Map<File, string>>(new Map());
  const { success, error, warning, info, loading, updateToast, removeToast } = useToast();
  
  // Loading state for initial document load from detail page
  const [isLoadingFromDetail, setIsLoadingFromDetail] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  
  // İhale selection state
  const [isLoadingTender, setIsLoadingTender] = useState(false);
  
  // Dropzone collapse state
  const [isDropzoneExpanded, setIsDropzoneExpanded] = useState(false);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Deep Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const { setCurrentAnalysis, setDataPool } = useAnalysisStore();

  // Calculate file hash for duplicate detection
  const calculateFileHash = async (file: File): Promise<string> => {
    if (file.size > 10 * 1024 * 1024) return ''; // Skip large files
    
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Generate PDF thumbnail
  const generatePDFThumbnail = async (file: File): Promise<string | undefined> => {
    try {
      // Create a simple canvas-based thumbnail placeholder
      // In production, you'd use pdf.js or server-side generation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      
      canvas.width = 200;
      canvas.height = 280;
      
      // Draw PDF icon background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#dc2626');
      gradient.addColorStop(1, '#991b1b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw PDF text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PDF', canvas.width / 2, canvas.height / 2 - 30);
      
      // Draw file name
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const name = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
      ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 40);
      
      // Draw file size
      const size = (file.size / 1024).toFixed(1) + ' KB';
      ctx.font = '12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(size, canvas.width / 2, canvas.height / 2 + 60);
      
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('PDF thumbnail generation failed:', e);
      return undefined;
    }
  };

  // Handle folder selection
  const handleFolderSelect = () => {
    folderInputRef.current?.click();
  };

  // Process folder input
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const filesArray = Array.from(fileList);
    const folderStructure: { [key: string]: File[] } = {};
    folderMapRef.current.clear();
    
    // Group files by folder
    filesArray.forEach(file => {
      const fileWithPath = file as File & { webkitRelativePath?: string };
      const path = fileWithPath.webkitRelativePath || file.name;
      const folderName = path.split('/')[0] || 'root';
      
      if (!folderStructure[folderName]) {
        folderStructure[folderName] = [];
      }
      folderStructure[folderName].push(file);
      folderMapRef.current.set(file, folderName);
    });
    
    const totalFiles = filesArray.length;
    const folderCount = Object.keys(folderStructure).length;
    
    info(
      `📁 ${folderCount} klasör yükleniyor`,
      `Toplam ${totalFiles} dosya işlenecek`
    );
    
    // Process all files
    await onDrop(filesArray);
    folderMapRef.current.clear();
    
    // Clear the input for future uploads
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(files.map(f => f.id));
        setSelectedFiles(allIds);
      }
      
      if (e.key === 'Delete' && selectedFiles.size > 0) {
        selectedFiles.forEach(id => removeFile(id));
        setSelectedFiles(new Set());
      }
      
      if (e.key === 'Escape') {
        setSelectedFiles(new Set());
        setShowPreview(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [files, selectedFiles]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  // Process file with real API
  const processFile = async (fileId: string) => {
    const fileItem = filesRef.current.find(f => f.id === fileId);
    if (!fileItem) return;

    // Immediately set status to uploading to show progress bar
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    // Check if large file
    if (fileItem.isLargeFile) {
      return processLargeFile(fileId);
    }

    const formData = new FormData();
    formData.append('file', fileItem.file);

    try {
      const response = await fetch('/api/analysis/process-single', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'x-want-streaming': 'true'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream not available');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Debug PDF processing
              if (fileItem.file.type === 'application/pdf' || fileItem.file.name.endsWith('.pdf')) {
                console.log(`[PDF Debug] ${fileItem.file.name}:`, data);
              }

              if (data.type === 'progress') {
                // Map API stages to UI stages
                const stageMap: Record<string, number> = {
                  'start': 0,
                  'upload': 0,
                  'processing': 1,
                  'extraction': 1,
                  'hash': 1,
                  'text': 1,
                  'ocr': 2,
                  'datapool': 3,
                  'complete': 4
                };

                const stage = stageMap[data.stage] ?? 0;
                const statusMap: Array<FileItem['status']> = ['uploading', 'parsing', 'extracting', 'analyzing', 'complete'];
                
                // Real-time progress update with actual value from API
                setFiles(prev => prev.map(f => 
                  f.id === fileId 
                    ? { 
                        ...f, 
                        status: statusMap[stage] || 'uploading',
                        stage: stage,
                        progress: data.progress || 0  // Use actual progress from API
                      }
                    : f
                ));
              } else if (data.type === 'success' && data.dataPool) {
                // Debug PDF DataPool
                if (fileItem.file.type === 'application/pdf' || fileItem.file.name.endsWith('.pdf')) {
                  console.log(`[PDF Debug - Success] ${fileItem.file.name} DataPool:`, {
                    hasDataPool: !!data.dataPool,
                    documents: data.dataPool?.documents?.length || 0,
                    textBlocks: data.dataPool?.textBlocks?.length || 0,
                    rawTextLength: data.dataPool?.rawText?.length || 0,
                    ocrUsed: data.dataPool?.metadata?.ocr_used || false,
                    fullDataPool: data.dataPool
                  });
                }

                const metrics: FileMetrics = {
                  tables: data.dataPool?.tables?.length || 0,
                  amounts: data.dataPool?.amounts?.length || 0,
                  entities: data.dataPool?.entities?.length || 0,
                  words: data.dataPool?.metadata?.total_words || 0,
                  dates: data.dataPool?.dates?.length || 0,
                  confidence: data.dataPool?.documents?.[0]?.type_confidence || 0,
                  pages: data.dataPool?.documents?.[0]?.page_count || 1,
                  language: 'TR',
                  categories: data.dataPool?.documents?.[0]?.categories || []
                };

                setFiles(prev => prev.map(f =>
                  f.id === fileId
                    ? {
                        ...f,
                        status: 'complete',
                        metrics,
                        dataPool: data.dataPool,
                        endTime: Date.now()
                      }
                    : f
                ));
                
                // ✅ NEW: Add to Zustand (single source of truth)
                const { addAnalysis } = useAnalysisStore.getState();
                addAnalysis({
                  id: data.analysisId || `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  status: 'completed',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  dataPool: data.dataPool,
                  inputFiles: [{
                    name: fileItem.file.name,
                    size: fileItem.file.size
                  }],
                  stats: {
                    documents: data.dataPool?.documents?.length || 0,
                    tables: data.dataPool?.tables?.length || 0,
                    textBlocks: data.dataPool?.textBlocks?.length || 0,
                    entities: data.dataPool?.entities?.length || 0,
                    amounts: data.dataPool?.amounts?.length || 0
                  }
                });
                
                success(
                  `${fileItem.file.name} işlendi`, 
                  `${metrics.tables} tablo, ${metrics.words} kelime bulundu`
                );
              } else if (data.type === 'error') {
                // Debug PDF errors
                if (fileItem.file.type === 'application/pdf' || fileItem.file.name.endsWith('.pdf')) {
                  console.error(`[PDF Debug - Error] ${fileItem.file.name}:`, data.error, data);
                }
                throw new Error(data.error || 'Processing failed');
              }
            } catch (parseError) {
              console.warn('SSE parse error:', parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('File processing error:', err);
      const message = err instanceof Error ? err.message : 'İşlem başarısız';
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error',
              error: message,
              endTime: Date.now()
            }
          : f
      ));
      
      error(`${fileItem.file.name} işlenemedi`, err instanceof Error ? err.message : String(err));
    }
  };

  // Process large file with chunk upload
  const processLargeFile = async (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId);
    if (!fileItem) return;

    const loadingId = loading(
      `${fileItem.file.name} yükleniyor`,
      'Büyük dosya - parçalı yükleme kullanılıyor'
    );

    try {
      const result = await ChunkUploader.uploadFile(
        fileItem.file,
        (progress) => {
          setFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, progress, status: 'uploading' }
              : f
          ));
        },
        (chunk, total) => {
          info(`Parça ${chunk}/${total} yüklendi`, fileItem.file.name);
        }
      );

      if (result.success) {
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, chunkUploadId: result.fileId, status: 'complete', endTime: Date.now() }
            : f
        ));
        
        removeToast(loadingId);
        success(`${fileItem.file.name} yüklendi`, 'Chunk upload başarılı');
      } else {
        throw new Error(result.error || 'Chunk upload failed');
      }
    } catch (err) {
      removeToast(loadingId);
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: err instanceof Error ? err.message : String(err), endTime: Date.now() }
          : f
      ));
      error(`${fileItem.file.name} yüklenemedi`, err instanceof Error ? err.message : String(err));
    }
  };

  // ============================================
  // İhale Selection Functions
  // ============================================

  /**
   * Handle tender selection - fetch all documents and add to file list
   */
  const handleTenderSelect = async (tender: any) => {
    setIsLoadingTender(true);
    const loadingId = loading(
      `🏢 ${tender.title}`,
      'İhale dökümanları ve formatları getiriliyor...'
    );

    try {
      AILogger.info('İhale seçildi', { 
        tenderId: tender.id, 
        title: tender.title,
        organization: tender.organization 
      });

      // 1. Get tender details with documents
      const detailResponse = await fetch(`/api/ihale/detail/${tender.id}`);
      const tenderDetail = await detailResponse.json();

      if (!detailResponse.ok || !tenderDetail) {
        throw new Error('İhale detayları alınamadı');
      }

      updateToast(loadingId, {
        description: 'Dökümanlar indiriliyor...',
        progress: 20
      });

      const allFiles: File[] = [];

      // 2. Download all documents
      if (tenderDetail.documents && tenderDetail.documents.length > 0) {
        let docCount = 0;
        for (const doc of tenderDetail.documents) {
          try {
            const proxyUrl = `/api/ihale/proxy?url=${encodeURIComponent(doc.url)}&worker=true&inline=true&binary=true`;
            const response = await fetch(proxyUrl);
            
            if (response.ok) {
              const blob = await response.blob();
              const filename = doc.filename || doc.name || doc.url.split('/').pop() || `document_${docCount + 1}.pdf`;
              const file = new File([blob], filename, { type: blob.type });
              allFiles.push(file);
              docCount++;

              updateToast(loadingId, {
                description: `${filename} indirildi (${docCount}/${tenderDetail.documents.length})`,
                progress: 20 + (docCount / tenderDetail.documents.length) * 50
              });
            }
          } catch (docError) {
            console.warn('Döküman indirilemedi:', doc.url, docError);
          }
        }
      }

      // 3. Add format exports (CSV, TXT, JSON)
      updateToast(loadingId, {
        description: 'Format dosyaları oluşturuluyor...',
        progress: 70
      });

      const formats = ['csv', 'txt', 'json'];
      for (const format of formats) {
        try {
          const exportResponse = await fetch(`/api/ihale/export-csv/${tender.id}?format=${format}`);
          
          if (exportResponse.ok) {
            const blob = await exportResponse.blob();
            const filename = `ihale_${tender.id}.${format}`;
            const file = new File([blob], filename, { 
              type: format === 'csv' ? 'text/csv' : 
                    format === 'json' ? 'application/json' : 
                    'text/plain' 
            });
            allFiles.push(file);
          }
        } catch (formatError) {
          console.warn(`${format.toUpperCase()} export başarısız:`, formatError);
        }
      }

      updateToast(loadingId, {
        description: 'Dosyalar işleniyor...',
        progress: 90
      });

      // 4. Check for duplicates and add only new files
      if (allFiles.length > 0) {
        // Filter out duplicates based on filename and size
        const existingFiles = new Set(files.map(f => `${f.file.name}_${f.file.size}`));
        const newFiles = allFiles.filter(file => {
          const fileKey = `${file.name}_${file.size}`;
          return !existingFiles.has(fileKey);
        });

        if (newFiles.length === 0) {
          updateToast(loadingId, {
            type: 'warning',
            title: '⚠️ Dosyalar zaten mevcut',
            description: 'Bu ihalenin tüm dosyaları zaten ekli',
            progress: undefined,
            persistent: false
          });
          return;
        }

        if (newFiles.length < allFiles.length) {
          const duplicateCount = allFiles.length - newFiles.length;
          warning(
            `${duplicateCount} dosya zaten mevcut`,
            `${newFiles.length} yeni dosya eklendi, ${duplicateCount} dosya atlandı`
          );
        }

        await onDrop(newFiles);
        
        updateToast(loadingId, {
          type: 'success',
          title: '✅ İhale dosyaları eklendi!',
          description: `${newFiles.length} dosya başarıyla eklendi`,
          progress: undefined,
          persistent: false
        });

        // Auto-remove success toast after 3 seconds
        setTimeout(() => {
          removeToast(loadingId);
        }, 3000);

        success(
          `${tender.title} eklendi`,
          `${newFiles.length} dosya (dökümanlar + formatlar) başarıyla eklendi`
        );
      } else {
        throw new Error('Hiç dosya indirilemedi');
      }

    } catch (error) {
      console.error('Tender selection error:', error);
      updateToast(loadingId, {
        type: 'error',
        title: '❌ İhale dosyaları eklenemedi',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        progress: undefined,
        persistent: false
      });
    } finally {
      setIsLoadingTender(false);
    }
  };

  // ============================================
  // Deep Analysis Functions
  // ============================================

  /**
   * Tüm dosyaların DataPool'larını tek bir DataPool'da birleştir
   */
  const mergeDataPools = (): DataPool => {
    const completedWithDataPool = completedFiles.filter(f => f.dataPool);

    // Debug PDF files in merge
    const pdfFiles = completedFiles.filter(f =>
      f.file.type === 'application/pdf' || f.file.name.endsWith('.pdf')
    );
    if (pdfFiles.length > 0) {
      console.log('[PDF Debug - Merge] PDF files status:', pdfFiles.map(f => ({
        name: f.file.name,
        status: f.status,
        hasDataPool: !!f.dataPool,
        textBlocks: (f.dataPool as any)?.textBlocks?.length || 0,
        rawTextLength: (f.dataPool as any)?.rawText?.length || 0
      })));
    }

    if (completedWithDataPool.length === 0) {
      AILogger.error('No files with DataPool', {
        completedFiles: completedFiles.length,
        filesStatus: completedFiles.map(f => ({ name: f.file.name, status: f.status, hasDataPool: !!f.dataPool }))
      });
      throw new Error(`Hiç dosya işlenmedi! ${completedFiles.length} dosya "complete" durumunda ama DataPool yok. Lütfen dosyaları tekrar yükleyin.`);
    }

    AILogger.info('Merging DataPools', { count: completedWithDataPool.length });

    // Merged DataPool başlangıç yapısı
    const mergedPool: DataPool = {
      documents: [],
      textBlocks: [],
      tables: [],
      dates: [],
      amounts: [],
      entities: [],
      rawText: '',
      metadata: {
        total_pages: 0,
        total_words: 0,
        extraction_time_ms: 0,
        ocr_used: false,
        languages_detected: ['tr'],
        warnings: [],
      },
      provenance: new Map(),
    };

    // Her dosyanın DataPool'unu birleştir
    completedWithDataPool.forEach((fileItem, index) => {
      const pool = fileItem.dataPool as DataPool | null;
      if (!pool) {
        AILogger.warn('DataPool missing for file - skipping', { filename: fileItem.file.name });
        return;
      }

      // Documents - source_file ekle
      if (pool.documents) {
        mergedPool.documents.push(...pool.documents.map(doc => ({
          ...doc,
          source_file: fileItem.file.name,
          file_index: index,
        })));
      }

      // Text Blocks
      if (pool.textBlocks) {
        mergedPool.textBlocks.push(...pool.textBlocks.map(block => ({
          ...block,
          source_file: fileItem.file.name,
        })));
      }

      // Tables - source bilgisi ekle
      if (pool.tables) {
        mergedPool.tables.push(...pool.tables.map(table => ({
          ...table,
          source_file: fileItem.file.name,
          source_document: fileItem.smartDetection?.documentType || 'Diğer',
        })));
      }

      // Dates
      if (pool.dates) {
        mergedPool.dates.push(...pool.dates.map(date => ({
          ...date,
          source_file: fileItem.file.name,
        })));
      }

      // Amounts
      if (pool.amounts) {
        mergedPool.amounts.push(...pool.amounts.map(amount => ({
          ...amount,
          source_file: fileItem.file.name,
        })));
      }

      // Entities
      if (pool.entities) {
        mergedPool.entities.push(...pool.entities.map(entity => ({
          ...entity,
          source_file: fileItem.file.name,
        })));
      }

      // Raw Text - dosya adı ile ayırarak ekle
      const separator = `\n\n${'='.repeat(80)}\n📄 ${fileItem.file.name}\n${'='.repeat(80)}\n\n`;
      mergedPool.rawText += separator + (pool.rawText || '');

      // Metadata güncelle
      mergedPool.metadata.total_words += pool.metadata?.total_words || 0;
      mergedPool.metadata.total_pages += pool.metadata?.total_pages || 0;
      mergedPool.metadata.ocr_used = mergedPool.metadata.ocr_used || pool.metadata?.ocr_used || false;
    });

    AILogger.success('DataPools merged', {
      documents: mergedPool.documents.length,
      tables: mergedPool.tables.length,
      words: mergedPool.metadata.total_words,
    });

    return mergedPool;
  };

  /**
   * Tüm dosyaların birleşik analizini başlat
   */
  const startDeepAnalysis = async () => {
    if (completedFiles.length === 0) {
      warning('Henüz dosya yüklenmedi', 'Önce ihale dosyalarını yükleyin ve işlenmesini bekleyin');
      return;
    }

    setIsAnalyzing(true);
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const loadingId = loading(
      '🧠 Derin AI Analizi Başlatılıyor',
      `${completedFiles.length} dosya birleştiriliyor ve analiz ediliyor...`
    );

    AILogger.sessionStart(analysisId);

    try {
      // 1. DataPool'ları birleştir
      info('DataPool birleştiriliyor', `${completedFiles.length} dosya`);
      const mergedDataPool = mergeDataPools();

      // Check if merged pool has any content
      const hasContent =
        mergedDataPool.documents.length > 0 ||
        mergedDataPool.tables.length > 0 ||
        mergedDataPool.textBlocks.length > 0 ||
        mergedDataPool.amounts.length > 0 ||
        mergedDataPool.entities.length > 0 ||
        (mergedDataPool.rawText?.trim().length ?? 0) > 0 ||
        (mergedDataPool.metadata?.total_words ?? 0) > 0 ||
        (mergedDataPool.metadata?.total_pages ?? 0) > 0;

      AILogger.info('Merged DataPool snapshot', {
        documents: mergedDataPool.documents.length,
        tables: mergedDataPool.tables.length,
        textBlocks: mergedDataPool.textBlocks.length,
        amounts: mergedDataPool.amounts.length,
        entities: mergedDataPool.entities.length,
        rawTextLength: mergedDataPool.rawText?.length ?? 0,
        totalWords: mergedDataPool.metadata?.total_words ?? 0,
        totalPages: mergedDataPool.metadata?.total_pages ?? 0,
        hasContent
      });

      if (!hasContent) {
        throw new Error('DataPool boş: Dosyalar yeterli içerik üretmedi. Lütfen farklı dosyalar deneyin.');
      }

      // Store'a kaydet
      setDataPool(analysisId, mergedDataPool);

      success('DataPool birleştirildi', `${mergedDataPool.documents.length} doküman, ${mergedDataPool.tables.length} tablo`);

      // 2. İhale bilgilerini otomatik çıkar
      info('İhale bilgileri çıkarılıyor', 'Otomatik tespit...');
      const extractedData = {
        kurum: detectInstitution(mergedDataPool),
        ihale_turu: detectTenderType(mergedDataPool),
        tahmini_bedel: extractBudget(mergedDataPool),
        kisilik: extractPersonCount(mergedDataPool),
        sure: extractDuration(mergedDataPool),
        ilan_tarihi: extractAnnouncementDate(mergedDataPool),
        son_basvuru: extractDeadline(mergedDataPool),
        files: completedFiles.map(f => ({
          name: f.file.name,
          type: f.smartDetection?.documentType || 'Diğer',
          size: f.file.size,
        })),
      };

      AILogger.info('Extracted data', extractedData);

      // 3. Background Analysis API'ye gönder
      info('Arka planda analiz başlatılıyor', 'Claude Sonnet 4.5');

      const response = await fetch('/api/analysis/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          dataPool: mergedDataPool,
          options: {
            extracted_data: extractedData,
          },
          background: true, // BACKGROUND MODE: API hemen döner
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Background Analysis API hatası');
      }

      const result = await response.json();

      AILogger.success('Background analysis started', {
        analysisId: result.analysisId,
        status: result.status,
      });

      // 4. Store'a kaydet (pending status)
      const { addAnalysis } = useAnalysisStore.getState();
      addAnalysis({
        id: analysisId,
        dataPool: mergedDataPool,
        deep_analysis: undefined,
        contextual_analysis: undefined,
        market_analysis: undefined,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inputFiles: completedFiles.map(f => ({
          name: f.file.name,
          size: f.file.size
        })),
        stats: {
          documents: mergedDataPool.documents.length,
          tables: mergedDataPool.tables.length,
          textBlocks: mergedDataPool.textBlocks.length,
          entities: mergedDataPool.entities.length,
          amounts: mergedDataPool.amounts.length
        }
      });
      setCurrentAnalysis(analysisId);

      removeToast(loadingId);
      success(
        '🚀 Analiz Başlatıldı!',
        'Arka planda devam ediyor. Sonuç sayfasında takip edebilirsiniz.'
      );

      AILogger.sessionEnd(analysisId, 'completed');

      // 5. Hemen sonuç sayfasına yönlendir (polling yapacak)
      router.push(`/analysis/${analysisId}`);

    } catch (err) {
      removeToast(loadingId);

      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      error('💥 Analiz Başarısız', errorMessage);

      AILogger.error('Deep analysis error', { error: errorMessage });
      AILogger.sessionEnd(analysisId, 'failed');

      console.error('Deep analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Kurum adını tespit et
   */
  const detectInstitution = (pool: DataPool): string => {
    const text = pool.rawText.toLowerCase();

    // Keyword matching
    if (text.includes('milli eğitim') || text.includes('meb')) return 'Milli Eğitim Bakanlığı';
    if (text.includes('sağlık bakanlığı')) return 'Sağlık Bakanlığı';
    if (text.includes('içişleri bakanlığı')) return 'İçişleri Bakanlığı';
    if (text.includes('büyükşehir belediyesi')) {
      const cityMatch = text.match(/(\w+)\s+büyükşehir\s+belediyesi/i);
      if (cityMatch) return `${cityMatch[1]} Büyükşehir Belediyesi`;
      return 'Büyükşehir Belediyesi';
    }
    if (text.includes('belediyesi')) {
      const cityMatch = text.match(/(\w+)\s+belediyesi/i);
      if (cityMatch) return `${cityMatch[1]} Belediyesi`;
      return 'Belediye';
    }

    // Entities'ten kurum tipli varlıkları kontrol et
    const orgEntities = pool.entities.filter(e => e.kind === 'kurum');
    if (orgEntities.length > 0) {
      return orgEntities[0].value;
    }

    return 'Tespit Edilemedi';
  };

  /**
   * İhale türünü tespit et
   */
  const detectTenderType = (pool: DataPool): string => {
    const text = pool.rawText.toLowerCase();

    if (text.includes('yemek') || text.includes('beslenme') || text.includes('gıda')) return 'Yemek Servisi';
    if (text.includes('temizlik')) return 'Temizlik Hizmeti';
    if (text.includes('danışmanlık')) return 'Danışmanlık Hizmeti';
    if (text.includes('güvenlik')) return 'Güvenlik Hizmeti';
    if (text.includes('bakım') || text.includes('onarım')) return 'Bakım-Onarım';
    if (text.includes('yazılım') || text.includes('bilişim')) return 'Bilişim Hizmeti';

    return 'Genel Hizmet Alımı';
  };

  /**
   * Bütçeyi çıkar
   */
  const extractBudget = (pool: DataPool): string | null => {
    if (!pool.amounts || pool.amounts.length === 0) return null;

    // En büyük tutarı bul (muhtemelen tahmini bedel)
    const amounts = pool.amounts
      .map(a => {
        // Type safety: handle both string and object formats
        let valueStr: string;
        
        if (typeof a === 'string') {
          valueStr = a;
        } else if (a && typeof a === 'object' && 'value' in a) {
          valueStr = typeof a.value === 'string' ? a.value : String(a.value || '');
        } else {
          AILogger.warn('Invalid amount format', { amount: a });
          return 0;
        }
        
        const cleaned = valueStr.replace(/[^0-9.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      })
      .filter(amt => amt > 0); // Only valid amounts

    if (amounts.length === 0) return null;

    const maxAmount = Math.max(...amounts);

    if (maxAmount > 0) {
      return `${maxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
    }

    return null;
  };

  /**
   * Kişi sayısını çıkar
   */
  const extractPersonCount = (pool: DataPool): string | null => {
    const text = pool.rawText;

    // "750 kişi", "750 kişilik", "750 öğrenci" gibi pattern'ler
    const personMatch = text.match(/(\d+)\s*(?:kişi|öğrenci|personel)/i);
    if (personMatch) return personMatch[1];

    return null;
  };

  /**
   * Süreyi çıkar
   */
  const extractDuration = (pool: DataPool): string | null => {
    const text = pool.rawText;

    // "12 ay", "2 yıl", "24 ay" gibi pattern'ler
    const durationMatch = text.match(/(\d+)\s*(ay|yıl)/i);
    if (durationMatch) {
      return `${durationMatch[1]} ${durationMatch[2]}`;
    }

    return null;
  };

  /**
   * İlan tarihini çıkar
   */
  const extractAnnouncementDate = (pool: DataPool): string | null => {
    if (!pool.dates || pool.dates.length === 0) return null;

    // İlk tarihi al (with type safety)
    const firstDate = pool.dates[0];
    
    if (typeof firstDate === 'string') {
      return firstDate;
    } else if (firstDate && typeof firstDate === 'object' && 'value' in firstDate) {
      return firstDate.value || null;
    }
    
    return null;
  };

  /**
   * Son başvuru tarihini çıkar
   */
  const extractDeadline = (pool: DataPool): string | null => {
    const text = pool.rawText.toLowerCase();

    // "son başvuru" ifadesinden sonraki tarihi bul
    const deadlineMatch = text.match(/son\s+başvuru[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
    if (deadlineMatch) return deadlineMatch[1];

    // Dates'ten en son tarihi al
    if (pool.dates.length > 0) {
      return pool.dates[pool.dates.length - 1].original || null;
    }

    return null;
  };

  // Dropzone configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const loadingToastId = loading('Dosyalar analiz ediliyor...', 'AI ile otomatik tanıma yapılıyor');

    // ✅ STEP 1: Extract ZIP files first
    const allFiles: File[] = [];
    for (const file of acceptedFiles) {
      if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.toLowerCase().endsWith('.zip')) {
        // ZIP dosyası - içindekileri çıkar
        info('📦 ZIP dosyası tespit edildi', file.name);

        const { ZipExtractor } = await import('@/lib/utils/zip-extractor');
        const result = await ZipExtractor.extract(file, (msg) => {
          info(msg);
        });

        if (result.success && result.files.length > 0) {
          // Convert extracted files to File objects
          const extractedFiles = result.files.map(extracted => {
            const cleanName = extracted.name.split('/').pop() || extracted.name;
            const folderPath = extracted.name.includes('/')
              ? extracted.name.split('/').slice(0, -1).join('/')
              : undefined;
            const file = ZipExtractor.arrayBufferToFile(extracted.content, cleanName, extracted.type);
            if (folderPath) {
              folderMapRef.current.set(file, folderPath);
            }
            return file;
          });
          allFiles.push(...extractedFiles);
          success(`${file.name} açıldı`, `${result.files.length} dosya çıkarıldı`);
        } else {
          error(`${file.name} açılamadı`, result.error || 'Bilinmeyen hata');
        }
      } else {
        // Normal dosya
        allFiles.push(file);
      }
    }

    // ✅ STEP 2: Check for duplicates
    const duplicates: File[] = [];
    const validFiles: File[] = [];

    for (const file of allFiles) {
      const hash = await calculateFileHash(file);
      if (hash && fileHashes.has(hash)) {
        duplicates.push(file);
      } else {
        validFiles.push(file);
        if (hash) setFileHashes(prev => new Set([...prev, hash]));
      }
    }

    removeToast(loadingToastId);
    
    if (duplicates.length > 0) {
      warning(
        `${duplicates.length} dosya zaten mevcut`,
        duplicates.map(f => f.name).join(', ')
      );
    }
    
    if (validFiles.length === 0) return;
    
    // Run AI detection
    const detections = await AIDocumentDetector.detectBatch(validFiles);
    
    // Create file items
    const newFiles: FileItem[] = await Promise.all(validFiles.map(async file => {
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const smartDetection = detections.get(file.name);
      const isLargeFile = file.size > 50 * 1024 * 1024;
      const folderName = folderMapRef.current.get(file);
      
      // Create preview for images and PDFs
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else if (file.type === 'application/pdf') {
        preview = await generatePDFThumbnail(file);
      }

      return {
        id,
        file,
        status: 'idle' as const,
        progress: 0,
        stage: 0,
        metrics: null,
        error: null,
        startTime: Date.now(),
        endTime: null,
        dataPool: null,
        preview,
        smartDetection,
        isLargeFile,
        folderName
      };
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    validFiles.forEach(file => folderMapRef.current.delete(file));
    
    // AI detection info will be shown in file list instead of toast
    
    // Auto-start processing with queue system (max 3 parallel)
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 500; // ms
    
    // Process files in batches to prevent server overload
    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      const batch = newFiles.slice(i, i + BATCH_SIZE);
      const batchDelay = i > 0 ? (i / BATCH_SIZE) * DELAY_BETWEEN_BATCHES : 100;
      
      batch.forEach((file, index) => {
        setTimeout(() => processFile(file.id), batchDelay + (index * 100));
      });
    }
  }, [fileHashes, loading, processFile, removeToast, warning]);

  // Load documents from ihale detail page (AFTER onDrop is defined)
  useEffect(() => {
    const loadDocumentsFromStorage = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { storage, StorageManager } = await import('@/lib/storage/storage-manager');

        // Check storage stats first
        const stats = StorageManager.getStats();
        console.log('📊 [DEBUG] Storage stats:', stats);

        const selectedData = storage.getTemp('ihaleSelectedDocs') as any;

        console.log('🔍 [DEBUG] Checking storage for ihaleSelectedDocs:', {
          found: !!selectedData,
          hasDocuments: selectedData?.documents?.length || 0,
          hasFormats: selectedData?.formats?.length || 0,
          tenderId: selectedData?.tenderId,
          timestamp: new Date().toISOString()
        });

        if (!selectedData || (!selectedData.documents?.length && !selectedData.formats?.length)) {
          // This is expected on first load - no need to warn
          if (process.env.NODE_ENV === 'development') {
            console.debug('📭 [DEBUG] No data in storage or empty arrays, skipping load (expected on first load)', {
              selectedData,
              storageKeys: Object.keys(localStorage).filter(k => k.includes('ihale'))
            });
          }
          return;
        }

        console.log('📦 [DEBUG] Loading documents from ihale detail:', {
          tenderId: selectedData.tenderId,
          documentsCount: selectedData.documents?.length || 0,
          formatsCount: selectedData.formats?.length || 0
        });
        console.log('📋 [DEBUG] Document URLs:', selectedData.documents);
        console.log('📊 [DEBUG] Formats:', selectedData.formats);

        // Clear storage after reading
        storage.removeTemp('ihaleSelectedDocs');
        console.log('🗑️ [DEBUG] Cleared ihaleSelectedDocs from storage');

        // 🎯 Calculate total files to download
        const totalFiles = selectedData.documents?.length || 0;
        let completedFiles = 0;

        // Set loading state for full screen progress
        setIsLoadingFromDetail(true);
        setLoadingProgress({
          current: 0,
          total: totalFiles,
          message: '📦 İhale dosyaları indiriliyor...'
        });

        // 🎯 Create single progress toast
        console.log('🎯 [DEBUG] Creating progress toast for', totalFiles, 'files');
        let progressToastId: string | null = null;
        progressToastId = loading('📦 Dosyalar getiriliyor...', `0/${totalFiles} dosya hazır`);
        console.log('✅ [DEBUG] Progress toast created with ID:', progressToastId);

        const downloadedFiles: File[] = [];

        // Download selected documents
        if (selectedData.documents && selectedData.documents.length > 0) {
          for (const docUrl of selectedData.documents) {
            try {
              // Check if this is a format export (format:csv:tenderId)
              if (docUrl.startsWith('format:')) {
                const [, formatType, tenderId] = docUrl.split(':');
                console.log(`📊 Fetching ${formatType.toUpperCase()} export for tender ${tenderId}`);
                
                const exportUrl = `/api/ihale/export-csv/${tenderId}?format=${formatType}`;
                const response = await fetch(exportUrl);
                
                if (!response.ok) {
                  throw new Error(`${formatType.toUpperCase()} export failed: ${response.status}`);
                }
                
                const blob = await response.blob();
                const filename = `ihale_${tenderId}.${formatType}`;
                const file = new File([blob], filename, { 
                  type: formatType === 'csv' ? 'text/csv' : 
                        formatType === 'json' ? 'application/json' : 
                        'text/plain' 
                });
                
                downloadedFiles.push(file);
                completedFiles++;
                
                updateToast(progressToastId, {
                  description: `${completedFiles}/${totalFiles} dosya hazır`,
                  progress: Math.round((completedFiles / totalFiles) * 100)
                });
                
                // Update full screen progress
                setLoadingProgress({
                  current: completedFiles,
                  total: totalFiles,
                  message: `📊 ${filename} indirildi`
                });
                
                continue; // Skip to next document
              }
              
              // Check if this is a ZIP-extracted document (format: zip:PROXY_URL#FILENAME)
              if (docUrl.startsWith('zip:')) {
                // Extract ZIP URL and filename from special format
                const [, zipUrlAndPath] = docUrl.split('zip:');
                const [zipUrl, filename] = zipUrlAndPath.split('#');

                if (!zipUrl || !filename) {
                  throw new Error('Invalid ZIP URL format');
                }

                console.log('📦 Extracting from ZIP:', { zipUrl, filename });

        const fetchZipBlob = async (): Promise<Blob> => {
          const buildProxyUrl = (url: string) =>
            `/api/ihale/proxy?url=${encodeURIComponent(url)}&worker=true&inline=true&binary=true`;

          const validateZipBlob = async (blob: Blob): Promise<boolean> => {
            if (blob.size < 4) return false;
            const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
            return (
              header[0] === 0x50 &&
              header[1] === 0x4b &&
              (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07) &&
              (header[3] === 0x04 || header[3] === 0x06 || header[3] === 0x08)
            );
          };

          const tryFetch = async (url: string, options?: RequestInit) => {
            const response = await fetch(url, options);
            if (!response.ok) {
              throw new Error(`ZIP isteği başarısız: ${response.status} ${response.statusText}`);
            }
            return response.blob();
          };

          // 1) Önce proxy üzerinden dene (worker cookie'leri ile)
          try {
            const proxyBlob = await tryFetch(buildProxyUrl(zipUrl));
            if (await validateZipBlob(proxyBlob)) {
              return proxyBlob;
            }
            console.warn('Proxy ZIP yanıtı geçersiz formatta, direkt URL deneniyor:', {
              zipUrl,
              size: proxyBlob.size,
              contentType: proxyBlob.type
            });
          } catch (proxyError) {
            console.warn('Proxy üzerinden ZIP indirme başarısız, direkt URL deneniyor:', {
              zipUrl,
              error: proxyError instanceof Error ? proxyError.message : String(proxyError)
            });
                }

          // 2) Proxy başarısız veya zip değilse doğrudan URL'den dene
          const directBlob = await tryFetch(zipUrl, { credentials: 'include' });
          if (await validateZipBlob(directBlob)) {
            return directBlob;
          }

          throw new Error('ZIP dosyası geçersiz veya indirilemedi');
        };

        const zipBlob = await fetchZipBlob();

                // Import JSZip dynamically
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(zipBlob);

                // Extract the specific file from ZIP
                const zipFile = zip.file(filename);
                if (!zipFile) {
                  throw new Error(`File not found in ZIP: ${filename}`);
                }

                const fileBlob = await zipFile.async('blob');

                // Detect MIME type from filename
                let mimeType = 'application/octet-stream';
                const ext = filename.toLowerCase().split('.').pop();
                if (ext === 'pdf') mimeType = 'application/pdf';
                else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                else if (ext === 'doc') mimeType = 'application/msword';
                else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                else if (ext === 'txt') mimeType = 'text/plain';

                // Create File object with proper filename
                const file = new File([fileBlob], filename, { type: mimeType });
                downloadedFiles.push(file);

                // Update progress
                completedFiles++;
                updateToast(progressToastId, {
                  description: `${completedFiles}/${totalFiles} dosya hazır`,
                  progress: Math.round((completedFiles / totalFiles) * 100)
                });
                
                // Update full screen progress
                setLoadingProgress({
                  current: completedFiles,
                  total: totalFiles,
                  message: `📄 ${filename} indirildi`
                });
              } else {
                // Regular document URL
                // Fetch the document
                const response = await fetch(docUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch document: ${response.statusText}`);
                }

                const blob = await response.blob();

                // Extract filename from URL or Content-Disposition
                let filename = 'document';

                // Try Content-Disposition header first
                const contentDisposition = response.headers.get('content-disposition');
                if (contentDisposition) {
                  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                  if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                  }
                }

                // Fallback to URL path
                if (filename === 'document') {
                  try {
                    const urlObj = new URL(docUrl, window.location.origin);
                    const pathParts = urlObj.pathname.split('/');
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart && lastPart.includes('.')) {
                      filename = lastPart;
                    }
                  } catch (e) {
                    console.warn('Failed to parse URL for filename:', e);
                  }
                }

                // Create File object with explicit MIME type
                // 🔥 CRITICAL: Infer MIME type from filename extension if blob.type is empty
                let mimeType = blob.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                  if (filename.toLowerCase().endsWith('.zip')) {
                    mimeType = 'application/zip';
                  } else if (filename.toLowerCase().endsWith('.pdf')) {
                    mimeType = 'application/pdf';
                  } else if (filename.toLowerCase().endsWith('.docx')) {
                    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  } else if (filename.toLowerCase().endsWith('.doc')) {
                    mimeType = 'application/msword';
                  } else if (filename.toLowerCase().endsWith('.xlsx')) {
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  } else if (filename.toLowerCase().endsWith('.xls')) {
                    mimeType = 'application/vnd.ms-excel';
                  } else if (filename.toLowerCase().endsWith('.txt')) {
                    mimeType = 'text/plain';
                  } else if (filename.toLowerCase().endsWith('.csv')) {
                    mimeType = 'text/csv';
                  } else if (filename.toLowerCase().endsWith('.json')) {
                    mimeType = 'application/json';
                  }
                }

                const file = new File([blob], filename, { type: mimeType });
                console.log(`📄 Created File: ${filename} (type: ${mimeType})`);
                downloadedFiles.push(file);

                // Update progress
                completedFiles++;
                updateToast(progressToastId, {
                  description: `${completedFiles}/${totalFiles} dosya hazır`,
                  progress: Math.round((completedFiles / totalFiles) * 100)
                });
                
                // Update full screen progress
                setLoadingProgress({
                  current: completedFiles,
                  total: totalFiles,
                  message: `📄 ${filename} indirildi`
                });
              }
            } catch (err) {
              console.error('Failed to load document:', err);
              // Don't show individual error toasts, will be handled in final catch
            }
          }
        }

        // Download selected data formats (TXT, CSV, JSON)
        if (selectedData.formats && selectedData.formats.length > 0 && selectedData.tenderId) {
          for (const format of selectedData.formats) {
            try {
              const exportUrl = `/api/ihale/export-csv/${selectedData.tenderId}?format=${format}`;
              const response = await fetch(exportUrl);

              if (!response.ok) {
                console.error(`❌ ${format.toUpperCase()} export failed: ${response.status} ${response.statusText}`);
                continue;
              }

              const blob = await response.blob();
              const filename = `ihale_${selectedData.tenderId}.${format}`;
              const file = new File([blob], filename, { type: blob.type });

              downloadedFiles.push(file);
              
              // Update progress
              completedFiles++;
              updateToast(progressToastId, {
                description: `${completedFiles}/${totalFiles} dosya hazır`,
                progress: Math.round((completedFiles / totalFiles) * 100)
              });
            } catch (err) {
              console.error(`❌ ${format.toUpperCase()} export error:`, err);
              // Don't show individual error toasts, will be handled in final catch
            }
          }
        }

        // Process all downloaded files - extract ZIPs and add to file list
        if (downloadedFiles.length > 0) {
          // Update progress toast for processing phase
          updateToast(progressToastId, {
            title: '📦 Dosyalar işleniyor...',
            description: 'ZIP dosyaları açılıyor...',
            progress: 100
          });
          
          // ✅ STEP 1: Extract ZIP files
          const processedFiles: File[] = [];
          let totalExtracted = 0;
          
          for (const file of downloadedFiles) {
            // 🔥 Güçlendirilmiş ZIP detection: type + extension + octet-stream check
            const isZip = 
              file.type === 'application/zip' || 
              file.type === 'application/x-zip-compressed' ||
              file.type === 'application/octet-stream' && file.name.toLowerCase().endsWith('.zip') ||
              file.name.toLowerCase().endsWith('.zip');
            
            if (isZip) {
              // ZIP dosyası - içindekileri çıkar
              console.log(`📦 ZIP dosyası tespit edildi: ${file.name} (type: ${file.type})`);

              const { ZipExtractor } = await import('@/lib/utils/zip-extractor');
              const result = await ZipExtractor.extract(file);

              if (result.success && result.files.length > 0) {
                // Convert extracted files to File objects
                const extractedFiles = result.files.map(extracted => {
                  const cleanName = extracted.name.split('/').pop() || extracted.name;
                  const folderPath = extracted.name.includes('/')
                    ? extracted.name.split('/').slice(0, -1).join('/')
                    : undefined;
                  const file = ZipExtractor.arrayBufferToFile(extracted.content, cleanName, extracted.type);
                  if (folderPath) {
                    folderMapRef.current.set(file, folderPath);
                  }
                  return file;
                });
                processedFiles.push(...extractedFiles);
                totalExtracted += result.files.length;
                console.log(`✅ ${file.name} açıldı: ${result.files.length} dosya çıkarıldı`);
              } else {
                console.error(`❌ ${file.name} açılamadı:`, result.error);
              }
            } else {
              // Normal dosya
              processedFiles.push(file);
            }
          }

          // ✅ STEP 2: Add to file list (call onDrop with processed files)
          if (processedFiles.length > 0) {
            await onDrop(processedFiles);
          }

          // 🎉 Final success toast
          updateToast(progressToastId, {
            type: 'success',
            title: '✅ Tüm dosyalar hazır!',
            description: `${totalFiles} dosya yüklendi${totalExtracted > 0 ? `, ${totalExtracted} dosya ZIP'den çıkarıldı` : ''}`,
            progress: undefined,
            persistent: false
          });

          // Auto-remove success toast after 3 seconds
          setTimeout(() => {
            removeToast(progressToastId);
          }, 3000);
        }
        
        // Hide loading overlay
        setIsLoadingFromDetail(false);
      } catch (err) {
        console.error('Error loading documents from storage:', err);
        
        // Hide loading overlay on error
        setIsLoadingFromDetail(false);
        // Update toast to error state
        // @ts-expect-error - progressToastId may be out of scope in catch block
        if (typeof progressToastId !== 'undefined' && progressToastId) {
          // @ts-expect-error - updateToast type inference issue with dynamic toast ID
          updateToast(progressToastId, {
            type: 'error',
            title: '❌ Yükleme hatası',
            description: err instanceof Error ? err.message : 'Bilinmeyen hata',
            progress: undefined,
            persistent: false
          });
        }
      }
    };

    loadDocumentsFromStorage();
  }, [onDrop, loading, updateToast, removeToast]); // Dependencies for useEffect

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    accept: Object.fromEntries(
      Object.entries(FILE_TYPES).map(([mime]) => [mime, []])
    ),
    multiple: true
  });

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Sort and filter files
  const getProcessedFiles = () => {
    let processed = [...files];
    
    // Filter
    if (searchTerm) {
      processed = processed.filter(f => 
        f.file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      processed = processed.filter(f => 
        f.file.type.includes(filterType) || 
        f.smartDetection?.documentType === filterType
      );
    }
    
    // Sort
    processed.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.file.name.localeCompare(b.file.name);
          break;
        case 'size':
          comparison = a.file.size - b.file.size;
          break;
        case 'date':
          comparison = a.startTime - b.startTime;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return processed;
  };

  // Bulk actions
  const applyBulkAction = (action: string, value?: string) => {
    const selectedIds = Array.from(selectedFiles);
    
    switch (action) {
      case 'delete':
        selectedIds.forEach(id => removeFile(id));
        success(`${selectedIds.length} dosya silindi`);
        break;
    }
    
    setSelectedFiles(new Set());
  };

  // Calculate totals
  const completedFiles = files.filter(f => f.status === 'complete');
  const processingFiles = files.filter(f => ['uploading', 'parsing', 'extracting', 'analyzing'].includes(f.status));
  const totalMetrics = completedFiles.reduce((acc, file) => {
    if (!file.metrics) return acc;
    return {
      tables: acc.tables + file.metrics.tables,
      amounts: acc.amounts + file.metrics.amounts,
      entities: acc.entities + file.metrics.entities,
      words: acc.words + file.metrics.words,
      dates: acc.dates + file.metrics.dates,
      pages: acc.pages + (file.metrics.pages || 0)
    };
  }, { tables: 0, amounts: 0, entities: 0, words: 0, dates: 0, pages: 0 });
  const totalSize = files.reduce((acc, file) => acc + file.file.size, 0);

  const determineFolderLabel = useCallback((folderFiles: FileItem[]): string => {
    const labelScores = new Map<string, number>();
    const addScore = (label: string, score = 1) => {
      labelScores.set(label, (labelScores.get(label) || 0) + score);
    };

    folderFiles.forEach(fileItem => {
      const detection = fileItem.smartDetection;
      const filename = fileItem.file.name.toLowerCase();
      const tags = (detection?.autoTags || []).map(tag => tag.toLowerCase());
      const combined = [filename, ...tags].join(' ');

      if (/(zeyil|zeyilname)/.test(combined)) addScore('Zeyilname', 4);
      if (/(ilan|duyuru)/.test(combined)) addScore('İhale İlanı', 3);
      if (/(idari|idarî|idari\s+sartname|idari_sartname|idari-sartname)/.test(combined)) addScore('İdari Şartname', 4);
      if (/(teknik|teknik\s+sartname)/.test(combined)) addScore('Teknik Şartname', 3);
      if (/(sozlesme|sözleşme)/.test(combined)) addScore('Sözleşme Taslağı', 2);
      if (/(finans|teminat)/.test(combined)) addScore('Finans Belgeleri', 1.5);
      if (/(teklif)/.test(combined)) addScore('Teklif Evrakı', 2);

      if (detection?.documentType) {
        addScore(DOCUMENT_LABEL_MAP[detection.documentType] || detection.documentType, 1.5);
      }

      if (detection?.suggestedCategory) {
        addScore(detection.suggestedCategory, 0.5);
      }
    });

    if (labelScores.size === 0) {
      return folderFiles.length > 1 ? 'Klasör' : 'Tekil Dosya';
    }

    let bestLabel = 'Klasör';
    let bestScore = -Infinity;
    labelScores.forEach((score, label) => {
      if (score > bestScore) {
        bestScore = score;
        bestLabel = label;
      }
    });
    return bestLabel;
  }, []);

  const folderSummaries = useMemo(() => {
    const groups = new Map<string, FileItem[]>();
    files.forEach(fileItem => {
      if (!fileItem.folderName || fileItem.folderName === 'root') return;
      if (!groups.has(fileItem.folderName)) {
        groups.set(fileItem.folderName, []);
      }
      groups.get(fileItem.folderName)!.push(fileItem);
    });

    return Array.from(groups.entries()).map(([folderName, folderFiles]) => {
      const label = determineFolderLabel(folderFiles);
      const processedCount = folderFiles.filter(f => f.status === 'complete').length;
      return {
        folderName,
        label,
        fileCount: folderFiles.length,
        processedCount
      };
    });
  }, [files, determineFolderLabel]);

  const processedFiles = getProcessedFiles();

  // Helper functions
  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };


  const getFileType = (file: File) => {
    return FILE_TYPES[file.type as keyof typeof FILE_TYPES] || 
           { icon: '📎', color: 'gray', label: 'FILE', gradient: 'from-gray-500 to-gray-600' };
  };

  return (
    <>
      {/* Loading Overlay for Detail Page Files */}
      {isLoadingFromDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 rounded-2xl p-8 max-w-md w-full border border-purple-500/20 shadow-2xl">
            <div className="text-center">
              {/* Animated Logo/Icon */}
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-20"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-40"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                  />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                İhale Dosyaları Yükleniyor
              </h2>

              {/* Message */}
              <p className="text-sm text-slate-400 mb-6">
                {loadingProgress.message || 'Dosyalar hazırlanıyor...'}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>İlerleme</span>
                  <span>{loadingProgress.current}/{loadingProgress.total} dosya</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: loadingProgress.total > 0 
                        ? `${(loadingProgress.current / loadingProgress.total) * 100}%` 
                        : '5%' 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Percentage */}
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {loadingProgress.total > 0 
                  ? Math.round((loadingProgress.current / loadingProgress.total) * 100) 
                  : 0}%
              </div>

              {/* Info Text */}
              <p className="text-xs text-slate-500 mt-4">
                Lütfen bekleyin, bu işlem birkaç dakika sürebilir...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto relative">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/30">
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Ultimate File Processor
                </h1>
                <p className="text-slate-400 mt-1">AI-powered document analysis platform</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          {files.length > 0 && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Dosya ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                aria-label="Dosya tipi filtresi"
              >
                <option value="all">Tüm Tipler</option>
                <option value="pdf">PDF</option>
                <option value="word">DOCX</option>
                <option value="spreadsheet">XLSX</option>
                <option value="text">TXT</option>
                <option value="csv">CSV</option>
                <option value="image">Resimler</option>
              </select>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('_');
                  setSortBy(by as 'name' | 'size' | 'date');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                aria-label="Sıralama seçenekleri"
              >
                <option value="date_desc">Tarih ↓</option>
                <option value="date_asc">Tarih ↑</option>
                <option value="name_asc">İsim A-Z</option>
                <option value="name_desc">İsim Z-A</option>
                <option value="size_desc">Boyut ↓</option>
                <option value="size_asc">Boyut ↑</option>
              </select>
            </div>
          )}
          
          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex gap-2 mb-4 p-3 bg-purple-900/20 border border-purple-600/30 rounded-xl">
              <span className="text-sm text-purple-400 mr-3">
                {selectedFiles.size} dosya seçili
              </span>
              <button
                onClick={() => applyBulkAction('delete')}
                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
              >
                Sil
              </button>
            </div>
          )}

        </motion.div>

        {/* İhale Selector Panel */}
        <IhaleSelector 
          onTenderSelect={handleTenderSelect}
          disabled={isLoadingTender || isLoadingFromDetail}
        />

        {/* Collapsible Manual File Upload */}
        <div className="mb-4">
          {/* Minimal Header */}
          <div
            onClick={() => setIsDropzoneExpanded(!isDropzoneExpanded)}
            className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-700/40 border border-slate-700/30 rounded-lg cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Manuel Dosya Ekle
              </span>
              <span className="text-xs text-slate-500">(isteğe bağlı)</span>
            </div>
            <motion.div
              animate={{ rotate: isDropzoneExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </motion.div>
          </div>

          {/* Expandable Dropzone */}
          <AnimatePresence>
            {isDropzoneExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-2"
              >
                <div
                  {...getRootProps()}
                  className={`
                    relative rounded-xl border-2 border-dashed p-6
                    transition-all duration-300 cursor-pointer
                    ${isDragging 
                      ? 'border-purple-500 bg-purple-950/30 shadow-lg' 
                      : 'border-slate-700/50 bg-slate-900/20 hover:border-purple-600/50'
                    }
                  `}
                >
                  <input {...getInputProps()} ref={fileInputRef} />
                  
                  <div className="text-center">
                    <motion.div
                      animate={{ 
                        y: isDragging ? -5 : 0,
                        scale: isDragging ? 1.1 : 1
                      }}
                      className="inline-flex p-2 bg-purple-600/20 rounded-xl mb-3"
                    >
                      <Upload className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    
                    <h4 className="text-base font-semibold text-white mb-2">
                      {isDragging ? '📥 Dosyaları Bırakın' : 'Dosya Yükle'}
                    </h4>
                    
                    <div className="flex justify-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 transition-all flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Dosya Seç
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderSelect();
                        }}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 transition-all flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4" />
                        Klasör
                      </button>
                    </div>
                    
                    <div className="text-xs text-slate-500">
                      PDF, DOCX, XLSX, CSV, TXT desteklenir
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Folder summaries */}
        {folderSummaries.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Yüklenen Klasörler
            </h3>
            <div className="flex flex-wrap gap-2">
              {folderSummaries.map(({ folderName, label, fileCount, processedCount }) => (
                <motion.div
                  key={folderName}
                  layout
                  className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      {folderName}
                    </div>
                    <div className="text-sm font-medium text-white">
                      {label}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {processedCount}/{fileCount} dosya
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Files List */}
        <AnimatePresence>
          {processedFiles.length > 0 && (
            <div>
              {/* List Header - BÜYÜTÜLDÜ */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  Yüklenen Dosyalar ({processedFiles.length})
                </h3>
                {completedFiles.length > 0 && (
                  <span className="text-sm text-green-400 font-semibold">
                    ✓ {completedFiles.length} dosya işlendi
                  </span>
                )}
              </div>
              
              {/* List Items - Grouped by Category */}
              <div className="space-y-4">
              {processedFiles.map((fileItem) => {
                const fileType = getFileType(fileItem.file);
                const isSelected = selectedFiles.has(fileItem.id);
                const isProcessing = fileItem.status !== 'idle' && fileItem.status !== 'complete' && fileItem.status !== 'error';
                const detection = fileItem.smartDetection;
                const qualityBadgeClass = detection
                  ? detection.quality === 'Yüksek'
                    ? 'bg-green-600/20 text-green-400'
                    : detection.quality === 'Orta'
                      ? 'bg-yellow-600/20 text-yellow-400'
                      : 'bg-red-600/20 text-red-400'
                  : '';
                const languageLabel = detection
                  ? detection.language === 'TR'
                    ? 'TR'
                    : detection.language === 'EN'
                      ? 'EN'
                      : 'OTHER'
                  : null;
                const rawWordCount = fileItem.metrics?.words;
                const estimatedWordCount = rawWordCount ?? Math.max(1, Math.round(fileItem.file.size / 8));
                const wordsLabel = rawWordCount !== undefined && rawWordCount !== null
                  ? rawWordCount.toLocaleString('tr-TR')
                  : `~${estimatedWordCount.toLocaleString('tr-TR')}`;
                const entitiesLabel = fileItem.metrics
                  ? fileItem.metrics.entities
                  : detection?.keyEntities?.length ?? 0;
                 
                return (
                  <motion.div
                    key={fileItem.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`
                      relative bg-slate-900/30 backdrop-blur-xl rounded-lg border overflow-hidden
                      transition-all duration-300
                      ${isSelected 
                        ? 'border-purple-500/40' 
                        : 'border-slate-800/40 hover:border-slate-700/50'
                      }
                    `}
                  >
                    {/* Progress Background - Daha şeffaf */}
                    {isProcessing && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-600/3 to-blue-600/3"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(fileItem.progress || 0, 5)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    
                    {/* Progress Bar Line - Daha şeffaf */}
                    {isProcessing && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/30">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500/40 to-blue-500/40"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(fileItem.progress || 0, 5)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                    
                    <div className="relative z-10 px-4 py-3">
                      <div className="flex items-center justify-between">
                        {/* Left side - File info */}
                        <div className="flex items-start gap-4 flex-1">
                          {/* Icon - Büyütüldü */}
                          <div className={`p-2 bg-linear-to-br ${fileType.gradient} rounded-lg bg-opacity-20`}>
                            <span className="text-2xl">{fileType.icon}</span>
                          </div>
                          
                          {/* File Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-white text-sm font-semibold truncate max-w-[300px]">
                                {fileItem.file.name}
                              </h4>
                              <span className="text-xs text-slate-500 font-medium">
                                ({formatSize(fileItem.file.size)})
                              </span>
                              {detection && (() => {
                                const mappedLabel =
                                  DOCUMENT_LABEL_MAP[detection.documentType as keyof typeof DOCUMENT_LABEL_MAP] ||
                                  detection.documentType ||
                                  'Genel Doküman';

                                const aiEvidenceLabel = detection.evidences
                                  ?.map(ev => ev.text)
                                  .find(text => typeof text === 'string' && /ai tespit/i.test(text));

                                const cleanedEvidenceLabel = aiEvidenceLabel
                                  ? aiEvidenceLabel.replace(/ai tespit\s*:\s*/i, '').trim()
                                  : null;

                                const documentLabel =
                                  cleanedEvidenceLabel && cleanedEvidenceLabel.length > 0
                                    ? cleanedEvidenceLabel
                                    : mappedLabel;

                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-purple-500/30 bg-purple-600/25 text-purple-100">
                                    <FileText className="w-3 h-3" />
                                    {documentLabel}
                                </span>
                                );
                              })()}
                              {fileItem.folderName && (
                                <span className="text-[10px] px-1 py-0.5 bg-slate-800/50 text-slate-300 rounded">
                                  📁 {fileItem.folderName}
                                </span>
                              )}
                              {fileItem.dataPool && (fileItem.dataPool as any).metadata?.ocr_used && (
                                <span className="text-[10px] px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full font-medium flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  OCR
                                </span>
                              )}
                          </div>
                           
                           {/* Zeyilname warning */}
                           {detection && detection.documentType === 'Zeyilname' && (
                              <div className="mt-1 p-1.5 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                                <p className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                                  <span>⚠️</span> Zeyilname tespit edildi - Değişiklikleri inceleyin
                                </p>
                                {detection.evidences && detection.evidences.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {detection.evidences
                                      .filter(e => e.type === 'content' || e.type === 'heading')
                                      .slice(0, 2)
                                      .map((e, idx) => (
                                        <li key={idx} className="text-[9px] text-yellow-300/80">
                                          • {e.text}
                                        </li>
                                      ))}
                                  </ul>
                                )}
                              </div>
                           )}
                           
                           {detection && (
                              <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs">
                                {/* Confidence - BÜYÜTÜLDÜ */}
                                <div className="relative group">
                                  <span className={`cursor-help px-2.5 py-1 rounded-md font-semibold text-sm ${
                                    detection.confidence >= 75 ? 'bg-green-500/20 text-green-400' :
                                    detection.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    %{Math.round(detection.confidence)} güven
                                  </span>

                                  {/* Evidence tooltip */}
                                  {detection.evidences && detection.evidences.length > 0 && (
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block
                                                    bg-slate-900 rounded-lg p-3 shadow-xl z-50 w-64
                                                    border border-slate-700/50">
                                      <h4 className="text-xs font-semibold mb-2 text-white">Veri Çıkarma Başarısı:</h4>

                                      {/* Evidences */}
                                      <ul className="space-y-1">
                                        {detection.evidences.slice(0, 3).map((evidence, idx) => (
                                          <li key={idx} className="text-xs text-slate-300">
                                            • {evidence.text}
                                          </li>
                                        ))}
                                        {detection.evidences.length > 3 && (
                                          <li className="text-xs text-slate-500 italic">
                                            +{detection.evidences.length - 3} kanıt daha...
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Language badge */}
                                {languageLabel && (
                                  <span className="px-2 py-1 bg-slate-800/60 rounded-md text-white font-medium">
                                    {languageLabel}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="mt-2 flex items-center gap-4 flex-wrap text-xs text-slate-400">
                              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                                <FileText className="w-4 h-4" />
                                {wordsLabel} kelime
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Tag className="w-4 h-4" />
                                {entitiesLabel} varlık
                              </span>
                            </div>
                          </div>
                          
                          {/* Status */}
                          <div className="flex items-center gap-4">
                            {/* Processing Status with Progress */}
                            {isProcessing && (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                                <span className="text-[10px] text-purple-400">
                                  {STAGES[fileItem.stage]?.description || 'İşleniyor...'}
                                </span>
                                <span className="text-[10px] text-purple-500 font-medium">
                                  %{Math.round(fileItem.progress || 0)}
                                </span>
                              </div>
                            )}
                            
                            {fileItem.status === 'complete' && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] text-green-400">Tamamlandı</span>
                              </div>
                            )}
                            
                            {fileItem.error && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-[10px] text-red-400">Hata</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Right side - Actions */}
                        <div className="flex items-center gap-1 ml-3">
                          {fileItem.preview && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPreview(fileItem.preview!);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-400 rounded transition-colors"
                              aria-label="Önizleme"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(fileItem.id);
                            }}
                            className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                            aria-label="Sil"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </div>
            </div>
          )}
        </AnimatePresence>

        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              height: 'auto',
              transition: {
                height: { type: 'spring', stiffness: 200, damping: 30 }
              }
            }}
            className="mt-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50"
          >
            {/* Özet bilgiler */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div 
                layout 
                className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-2xl p-4 text-center backdrop-blur-sm hover:scale-105 transition-transform duration-300"
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-400 drop-shadow-lg" />
                <div className="text-xl font-bold text-white mb-1">{files.length}</div>
                <div className="text-xs text-slate-400 font-medium">Toplam Dosya</div>
              </motion.div>
              <motion.div 
                layout 
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 text-center backdrop-blur-sm hover:scale-105 transition-transform duration-300"
              >
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400 drop-shadow-lg" />
                <div className="text-xl font-bold text-green-400 mb-1">{completedFiles.length}</div>
                <div className="text-xs text-slate-400 font-medium">Tamamlandı</div>
              </motion.div>
              <motion.div 
                layout 
                className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-2xl p-4 text-center backdrop-blur-sm hover:scale-105 transition-transform duration-300"
              >
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-400 drop-shadow-lg" />
                <div className="text-xl font-bold text-yellow-400 mb-1">{processingFiles.length}</div>
                <div className="text-xs text-slate-400 font-medium">İşleniyor</div>
              </motion.div>
              <motion.div 
                layout 
                className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl p-4 text-center backdrop-blur-sm hover:scale-105 transition-transform duration-300"
              >
                <Database className="w-6 h-6 mx-auto mb-2 text-purple-400 drop-shadow-lg" />
                <div className="text-xl font-bold text-white mb-1">{formatSize(totalSize)}</div>
                <div className="text-xs text-slate-400 font-medium">Toplam Boyut</div>
              </motion.div>
              {completedFiles.filter(f => f.dataPool && (f.dataPool as any).metadata?.ocr_used).length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-800/30 rounded-lg p-3 text-center"
                >
                  <Eye className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <div className="text-lg font-bold text-blue-400">
                    {completedFiles.filter(f => f.dataPool && (f.dataPool as any).metadata?.ocr_used).length}
                  </div>
                  <div className="text-[10px] text-slate-400">OCR Kullanıldı</div>
                </motion.div>
              )}
            </div>

            {/* Detaylı metrikler - işlem tamamlandıkça güncellenen */}
            {completedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3"
              >
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">{totalMetrics.tables}</div>
                  <div className="text-[10px] text-slate-400">Tablo</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">{totalMetrics.words.toLocaleString('tr-TR')}</div>
                  <div className="text-[10px] text-slate-400">Kelime</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">{totalMetrics.amounts}</div>
                  <div className="text-[10px] text-slate-400">Tutar</div>
                </div>
              </motion.div>
            )}

            {/* Action Button */}
            <motion.button
              key={`action-button-${isAnalyzing ? 'analyzing' : completedFiles.length === 0 ? 'empty' : 'ready'}`}
              whileHover={{ scale: isAnalyzing || completedFiles.length === 0 ? 1 : 1.02 }}
              whileTap={{ scale: isAnalyzing || completedFiles.length === 0 ? 1 : 0.98 }}
              onClick={startDeepAnalysis}
              disabled={isAnalyzing || completedFiles.length === 0}
              className={`
                w-full mt-4 py-4 text-white rounded-2xl font-bold text-lg shadow-2xl
                transition-all flex items-center justify-center gap-3
                ${isAnalyzing || completedFiles.length === 0
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 hover:shadow-purple-500/50'
                }
              `}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : completedFiles.length === 0 ? (
                <>
                  <AlertCircle className="w-6 h-6" />
                  Önce Dosya Yükleyin
                </>
              ) : (
                <>
                  <Brain className="w-6 h-6" />
                  Derin AI Analizi Başlat ({completedFiles.length} dosya)
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}

      </div>

      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        multiple
        className="hidden"
        aria-label="Klasör seçimi"
      />
      
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
            onClick={() => setShowPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPreview(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-10"
                aria-label="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={showPreview} 
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}