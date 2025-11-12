'use client';
import { ReplicaFrame } from '@/components/tender/ReplicaFrame';
import { PIPELINE_STEPS, usePipelineStore } from '@/store/usePipelineStore';
import { AnimatePresence, motion } from 'framer-motion';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Brain,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Monitor,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function IhaleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  interface DocumentType {
    url: string;
    name?: string;
    [key: string]: unknown;
  }

  interface AIParsedSection {
    category: string;
    items: Array<{ key: string; value: string }>;
  }

  interface AIParsedTable {
    title?: string;
    headers: string[];
    rows: string[][];
  }

  interface AIParsedData {
    sections?: AIParsedSection[];
    tables?: AIParsedTable[];
    textContent?: string[];
  }

  interface TenderDetail {
    id?: string;
    title?: string;
    status?: string;
    bulletin_date?: string;
    deadline?: string;
    institution?: string;
    description?: string;
    organization?: string;
    city?: string;
    tenderType?: string;
    partialBidAllowed?: boolean;
    publishDate?: string;
    tenderDate?: string;
    daysRemaining?: number;
    tenderNumber?: string;
    html?: string;
    html_iframe?: string;
    html_raw?: string;
    html_snapshot?: string;
    html_formatted?: string;
    documents?: DocumentType[];
    ai_parsed?: AIParsedData | Record<string, unknown>;
    estimatedCost?: string;
    url?: string;
    [key: string]: unknown;
  }

  const [detail, setDetail] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false); // Force refresh bypass cache
  // Birebir görünüm accordion state (varsayılan kapalı)
  const [birebirGorunumExpanded, setBirebirGorunumExpanded] = useState(false);
  
  // Pagination states for each card
  const [ihaleBilgileriPage, setIhaleBilgileriPage] = useState(1);
  const [idareBilgileriPage, setIdareBilgileriPage] = useState(1);
  const [ihaleIlaniPage, setIhaleIlaniPage] = useState(1);
  
  // Items per page
  const ITEMS_PER_PAGE = 10;
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set()); // Seçili dökümanlar
  const [selectedDataFormats, setSelectedDataFormats] = useState<Set<string>>(new Set()); // Seçili veri formatları (txt, csv, json)
  const [previewFormat, setPreviewFormat] = useState<string | null>(null); // Önizleme formatı
  const [previewContent, setPreviewContent] = useState<string>(''); // Önizleme içeriği
  const [loadingPreview] = useState(false); // Önizleme yükleniyor mu
  const [hoverFormat, setHoverFormat] = useState<string | null>(null); // Hover önizleme formatı
  const [hoverContent, setHoverContent] = useState<string>(''); // Hover önizleme içeriği
  const [loadingHover, setLoadingHover] = useState(false); // Hover önizleme yükleniyor mu
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null); // Hover popup pozisyonu
  const hoverButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Hover kapanma timeout'u
  const [expandedDocuments, setExpandedDocuments] = useState<DocumentType[]>([]); // ZIP içinden çıkarılmış dosyalar
  const [loadingZip, setLoadingZip] = useState<Set<string>>(new Set()); // ZIP açılıyor mu
  const processedZipUrlsRef = useRef<Set<string>>(new Set()); // İşlenmiş ZIP URL'leri (tekrar işleme önleme)
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set()); // İndirilen dosyalar (çift tıklama önleme)
  // Sidebar state - currently unused but may be needed in future
  // const [sidebarExpanded, setSidebarExpanded] = useState({
  //   quickActions: true,
  //   dates: true,
  //   reference: true
  // });

  const {
    selectedTender,
    setCurrentStep,
    markStepCompleted,
    getProgress
  } = usePipelineStore();

  // Track previous ID to only reset when ID actually changes
  const prevIdRef = useRef<string | undefined>(undefined);

  const persistExpandedDocuments = useCallback(async (docs: DocumentType[]) => {
    try {
      const { StorageManager } = await import('@/lib/storage/storage-manager');
      if (docs.length === 0) {
        StorageManager.remove(`tender_detail_expanded_${id}`);
        return;
      }
      StorageManager.set(`tender_detail_expanded_${id}`, docs, 24 * 60 * 60 * 1000);
    } catch (err) {
      console.warn('Expanded documents cache save failed:', err);
    }
  }, [id]);

  const persistProcessedZipUrls = useCallback(async (urls: string[]) => {
    try {
      const { StorageManager } = await import('@/lib/storage/storage-manager');
      if (urls.length === 0) {
        StorageManager.remove(`tender_detail_processed_zip_${id}`);
        return;
      }
      StorageManager.set(`tender_detail_processed_zip_${id}`, urls, 24 * 60 * 60 * 1000);
    } catch (err) {
      console.warn('Processed ZIP cache save failed:', err);
    }
  }, [id]);
  
  useEffect(() => {
    // Only reset ZIP processing when tender ID actually changes
    if (prevIdRef.current !== id) {
      processedZipUrlsRef.current.clear();
      setExpandedDocuments([]);
      persistProcessedZipUrls([]);
      persistExpandedDocuments([]);
      prevIdRef.current = id;
    }
    
    // Set current step
    setCurrentStep(PIPELINE_STEPS.TENDER_DETAIL);
    markStepCompleted(PIPELINE_STEPS.TENDER_DETAIL);

    // If we have selectedTender from the store, use that data first
    if (selectedTender) {
      // We have basic data from the list, show it immediately
      setDetail({
        id: selectedTender.id,
        title: selectedTender.title,
        organization: selectedTender.organization,
        city: selectedTender.city,
        tenderType: selectedTender.tenderType,
        partialBidAllowed: selectedTender.partialBidAllowed,
        publishDate: selectedTender.publishDate,
        tenderDate: selectedTender.tenderDate,
        daysRemaining: (selectedTender.daysRemaining ?? undefined) as number | undefined,
        tenderNumber: selectedTender.tenderNumber,
        url: selectedTender.url,
        documents: [],
        html: '<p class="text-slate-400">Detaylı bilgiler yükleniyor...</p>'
      });
      setLoading(false);
    }

    // Fetch full details from API (with HTML content and documents)
    // Wrap in promise to handle all rejections properly
    const fetchPromise = (async () => {
      try {
        setLoading(true);

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          try {
            const { StorageManager } = await import('@/lib/storage/storage-manager');
            const cachedExpanded = StorageManager.get<DocumentType[]>(`tender_detail_expanded_${id}`);
            const cachedProcessed = StorageManager.get<string[]>(`tender_detail_processed_zip_${id}`);
            const cached = StorageManager.get<TenderDetail>(`tender_detail_${id}`);

            if (cachedExpanded && cachedExpanded.length > 0) {
              setExpandedDocuments(cachedExpanded);
            }

            if (cachedProcessed && cachedProcessed.length > 0) {
              processedZipUrlsRef.current = new Set(cachedProcessed);
            }

            if (cached) {
              console.log('📦 Using cached tender detail:', id);
              setDetail(cached);
              setLoading(false);
              setError('');
              return; // Skip API fetch
            }
          } catch (err) {
            console.warn('Cache read failed:', err);
          }
        }

        setForceRefresh(false); // Reset force refresh flag
        // Add timeout to prevent hanging (increased for AI parsing)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout (AI parsing can take time)
        
        const res = await fetch(`/api/ihale/detail/${id}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();

        if (!res.ok) {
          // If login failed, show warning but keep basic data
          if (data.error === 'login_failed' && selectedTender) {
            setDetail((prev: TenderDetail | null) => ({
              ...prev,
              html: `
                <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p class="text-red-400 font-semibold mb-2">İhalebul.com Bağlantı Hatası</p>
                  <p class="text-slate-300">${data.message || 'İhalebul.com\'a bağlanılamadı.'}</p>
                  <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
                </div>
              `
            }));
            setError('');
          } else {
            throw new Error(data.message || data.error);
          }
        } else {
          // Successfully fetched from ihalebul.com
          // The API now returns multiple HTML formats
          
          // Debug: Log AI parsed data (only in development)
          if (data.ai_parsed) {
            if (process.env.NODE_ENV === 'development') {
            const aiParsed = data.ai_parsed as AIParsedData;
            console.log('✅ AI Parsed Data received:', {
              hasSections: !!aiParsed.sections,
              sectionsCount: aiParsed.sections?.length || 0,
              hasTables: !!aiParsed.tables,
              tablesCount: aiParsed.tables?.length || 0,
              hasTextContent: !!aiParsed.textContent,
              textContentCount: aiParsed.textContent?.length || 0
            });
            }
          } else {
            // Only warn if we're in development mode - in production, fallback parsing is acceptable
            if (process.env.NODE_ENV === 'development') {
              console.debug('ℹ️ No AI parsed data in response (using fallback parsing)');
            }
          }

          // Create new detail object and update state
          let newDetail: TenderDetail;
          setDetail((prev: TenderDetail | null) => {
            newDetail = {
              ...prev,
              ...data,
              // Keep the existing fields if API doesn't return them
              organization: data.organization || prev?.organization,
              city: data.city || prev?.city,
              tenderType: data.tenderType || prev?.tenderType,
              partialBidAllowed: data.partialBidAllowed ?? prev?.partialBidAllowed,
              publishDate: data.publishDate || prev?.publishDate,
              tenderDate: data.tenderDate || prev?.tenderDate,
              daysRemaining: data.daysRemaining ?? prev?.daysRemaining,
              // CRITICAL: Ensure documents array is preserved from API response
              documents: Array.isArray(data.documents) ? data.documents : (prev?.documents || []),
              // CRITICAL: Ensure ai_parsed is preserved
              ai_parsed: data.ai_parsed || prev?.ai_parsed
            };
            return newDetail;
          });
          setError('');

          // Cache the detail (varsayılan TTL: 7 gün)
          (async () => {
            try {
              const { StorageManager } = await import('@/lib/storage/storage-manager');
              StorageManager.set(`tender_detail_${id}`, newDetail);
              console.log('💾 Tender detail cached:', id);
            } catch (err) {
              console.warn('Cache save failed:', err);
            }
          })();
          
          // Extract ZIP files from documents
          if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
            const zipDocs: DocumentType[] = [];
            const regularDocs: DocumentType[] = [];
            
            for (const doc of data.documents) {
              const isZip = doc.fileType === 'zip' || 
                           (typeof doc.filename === 'string' && doc.filename.toLowerCase().endsWith('.zip')) ||
                           (typeof doc.name === 'string' && doc.name.toLowerCase().endsWith('.zip')) ||
                           (typeof doc.url === 'string' && doc.url.toLowerCase().includes('.zip'));
              
              if (isZip) {
                zipDocs.push(doc);
              } else {
                regularDocs.push(doc);
              }
            }
            
            // Process ZIP files in background
            if (zipDocs.length > 0) {
              // Wrap in promise to handle all rejections
              Promise.resolve().then(async () => {
                const extracted: DocumentType[] = [];
                
                for (const zipDoc of zipDocs) {
                  if (!zipDoc.url) continue;
                  
                  // Skip if already processed
                  if (processedZipUrlsRef.current.has(zipDoc.url)) {
                    continue;
                  }
                  
                  processedZipUrlsRef.current.add(zipDoc.url);
                  persistProcessedZipUrls(Array.from(processedZipUrlsRef.current));
                  setLoadingZip(prev => new Set(prev).add(zipDoc.url));
                  
                  try {
                    // Use inline=true to prevent browser from downloading ZIP file automatically
                    const res = await fetch(`/api/ihale/proxy?url=${encodeURIComponent(zipDoc.url)}&worker=true&inline=true`);
                    if (!res.ok) {
                      console.warn(`ZIP download failed for ${zipDoc.url}: ${res.status} ${res.statusText}`);
                      continue;
                    }
                    
                    const blob = await res.blob();
                    
                    // Check if blob is actually a ZIP file by checking magic bytes
                    const firstBytes = await blob.slice(0, 4).arrayBuffer();
                    const magicBytes = new Uint8Array(firstBytes);
                    const isZipFile = magicBytes[0] === 0x50 && magicBytes[1] === 0x4B && 
                                     (magicBytes[2] === 0x03 || magicBytes[2] === 0x05 || magicBytes[2] === 0x07) &&
                                     (magicBytes[3] === 0x04 || magicBytes[3] === 0x06 || magicBytes[3] === 0x08);
                    
                    if (!isZipFile && blob.type !== 'application/zip' && !zipDoc.url.toLowerCase().includes('.zip')) {
                      // Not actually a ZIP, treat as regular doc
                      console.warn(`File is not a valid ZIP: ${zipDoc.url}, type: ${blob.type}, size: ${blob.size}`);
                      continue;
                    }
                    
                    if (blob.size === 0) {
                      console.warn(`ZIP file is empty: ${zipDoc.url}`);
                      continue;
                    }
                    
                    const zip = new JSZip();
                    const zipContent = await zip.loadAsync(blob);
                    const fileEntries = Object.entries(zipContent.files);
                    
                    for (const [path, zipFile] of fileEntries) {
                      if (zipFile.dir) continue;
                      if (path.toLowerCase().endsWith('.zip')) continue; // Skip nested ZIPs
                      
                      const filename = path.split('/').pop() || path;
                      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                      
                      // Determine file type
                      let fileType = 'unknown';
                      if (ext === '.pdf') fileType = 'pdf';
                      else if (ext === '.docx') fileType = 'docx';
                      else if (ext === '.doc') fileType = 'doc';
                      else if (ext === '.xlsx') fileType = 'xlsx';
                      else if (ext === '.xls') fileType = 'xls';
                      else if (ext === '.txt') fileType = 'txt';
                      else if (ext === '.html' || ext === '.htm') fileType = 'html';
                      else if (ext === '.csv') fileType = 'csv';
                      
                      // Get file size by reading blob
                      const fileBlob = await zipFile.async('blob');
                      
                      // Create document entry for extracted file
                      // Use special format for ZIP-extracted files: zip:ZIP_URL#PATH
                      extracted.push({
                        url: `zip:${zipDoc.url}#${path}`, // Special format for ZIP-extracted files
                        filename: filename,
                        name: filename,
                        title: filename,
                        fileType: fileType,
                        size: fileBlob.size,
                        _fromZip: true,
                        _zipUrl: zipDoc.url,
                        _zipPath: path
                      } as DocumentType);
                    }
                  } catch (error) {
                    // Check if it's a JSZip error about invalid ZIP format
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage.includes('end of central directory') || 
                        errorMessage.includes('is this a zip file') ||
                        errorMessage.includes('Can\'t find')) {
                      // Invalid ZIP file - might be HTML error page or corrupted file
                      console.warn(`Invalid ZIP file format: ${zipDoc.url}`, errorMessage);
                    } else {
                      console.error('Failed to extract ZIP:', zipDoc.url, error);
                    }
                  } finally {
                    setLoadingZip(prev => {
                      const next = new Set(prev);
                      next.delete(zipDoc.url);
                      return next;
                    });
                  }
                }
                
                // Only update if we have extracted files and ID hasn't changed
                if (extracted.length > 0 && prevIdRef.current === id) {
                  setExpandedDocuments(prev => {
                    // Merge with existing, avoiding duplicates
                    const existingUrls = new Set(prev.map(doc => doc.url));
                    const newDocs = extracted.filter(doc => !existingUrls.has(doc.url));
                    const updated = [...prev, ...newDocs];
                    persistExpandedDocuments(updated);
                    persistProcessedZipUrls(Array.from(processedZipUrlsRef.current));
                    return updated;
                  });
                }
              }).catch((error) => {
                // Handle any unhandled promise rejections in ZIP processing
                console.error('Unhandled error in ZIP processing:', error);
                // Don't throw - this is background processing, errors are already logged
              });
            }
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Bilinmeyen hata';
        const isTimeout = e instanceof Error && (e.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('aborted'));
        
        console.error('Error fetching tender detail:', e);

        // If we have basic data from selectedTender, show it with error message
        if (selectedTender) {
          setDetail((prev: TenderDetail | null) => ({
            ...prev,
            html: `
              <div class="p-4 ${isTimeout ? 'bg-orange-500/10 border-orange-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} rounded-lg">
                <p class="${isTimeout ? 'text-orange-400' : 'text-yellow-400'} font-semibold mb-2">
                  ${isTimeout ? '⏱️ Yükleme Zaman Aşımına Uğradı' : 'Detaylı Bilgi Alınamadı'}
                </p>
                <p class="text-slate-300">${isTimeout ? 'İhale detayları yüklenirken zaman aşımı oluştu. Lütfen sayfayı yenileyin.' : errorMessage}</p>
                <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
              </div>
            `
          }));
          setError('');
        } else {
          setError(isTimeout ? 'Yükleme zaman aşımına uğradı. Lütfen tekrar deneyin.' : errorMessage);
        }
      } finally {
        setLoading(false);
      }
    })();
    
    // Handle promise rejections properly
    fetchPromise.catch((error) => {
      // This should not happen as all errors are caught in try-catch
      // But handle it just in case
      console.error('Unhandled promise rejection in fetch:', error);
      setLoading(false);
      if (!selectedTender) {
        setError('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.');
      }
    });
  }, [id, setCurrentStep, markStepCompleted, selectedTender, forceRefresh, persistExpandedDocuments, persistProcessedZipUrls]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-300">İhale detayları yükleniyor...</p>
          <p className="text-sm text-slate-400 mt-2">İhalebul.com&apos;dan veri çekiliyor</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-center border-red-500/30">
          <div className="text-red-400 text-lg mb-2">❌ Hata</div>
          <div className="text-slate-300">{error}</div>
          <Link
            href="/ihale"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Listeye Dön
          </Link>
        </div>
      </div>
    );
  }

  const getProgressClass = () => {
    const progress = getProgress();
    if (progress >= 90) return 'progress-100';
    if (progress >= 80) return 'progress-90';
    if (progress >= 70) return 'progress-80';
    if (progress >= 60) return 'progress-70';
    if (progress >= 50) return 'progress-60';
    if (progress >= 40) return 'progress-50';
    if (progress >= 30) return 'progress-40';
    if (progress >= 20) return 'progress-30';
    if (progress >= 10) return 'progress-20';
    return progress > 0 ? 'progress-10' : 'progress-0';
  };

  if (!detail) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Progress Bar - Fixed at top */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pipeline İlerlemesi</span>
            <span className="text-indigo-400 font-bold">{getProgress()}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out rounded-full ${getProgressClass()}`}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/ihale"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">İhale Listesi</span>
          </Link>

          <a
            href={`https://www.ihalebul.com/tender/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">İhalebul.com&apos;da Aç</span>
          </a>
        </div>

        {/* Main Header Card - Premium */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative group mb-6"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          
          <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/30 overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold bg-linear-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm shadow-sm"
                  >
                    #{detail.tenderNumber || detail.id}
                  </motion.span>
                  {detail.daysRemaining !== null && detail.daysRemaining !== undefined && (
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-sm shadow-sm ${
                        detail.daysRemaining < 0 ? 'bg-linear-to-r from-gray-500/20 to-gray-600/20 text-gray-300 border-gray-500/30' :
                        detail.daysRemaining === 0 ? 'bg-linear-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-500/30 animate-pulse' :
                        detail.daysRemaining <= 3 ? 'bg-linear-to-r from-red-500/20 to-orange-500/20 text-red-300 border-red-500/30' :
                        detail.daysRemaining <= 7 ? 'bg-linear-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30' :
                        'bg-linear-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30'
                      }`}
                    >
                      {detail.daysRemaining < 0 ? 'Süresi Geçti' :
                       detail.daysRemaining === 0 ? '⚠️ BUGÜN!' :
                       detail.daysRemaining === 1 ? '1 Gün Kaldı' :
                       `${detail.daysRemaining} Gün Kaldı`}
                    </motion.span>
                  )}
                </div>

                <h1 className="text-lg lg:text-xl font-bold mb-4 leading-tight line-clamp-2 bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">
                  {detail.title}
                </h1>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="group/item">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Kurum</p>
                    <p className="text-xs font-semibold text-slate-200 truncate group-hover/item:text-indigo-300 transition-colors">{detail.organization || '-'}</p>
                  </div>
                  <div className="group/item">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Şehir</p>
                    <p className="text-xs font-semibold text-slate-200 group-hover/item:text-indigo-300 transition-colors">{detail.city || '-'}</p>
                  </div>
                  <div className="group/item">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">İhale Türü</p>
                    <p className="text-xs font-semibold text-slate-200 truncate group-hover/item:text-indigo-300 transition-colors">{detail.tenderType || '-'}</p>
                  </div>
                  <div className="group/item">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Teklif Tarihi</p>
                    <p className="text-xs font-semibold text-indigo-400 group-hover/item:text-indigo-300 transition-colors">{detail.tenderDate || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setForceRefresh(true)}
                disabled={loading}
                className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm hover:from-indigo-500/30 hover:to-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Verileri Yenile"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Key Information Grid - Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative group h-full"
          >
            <div className="absolute -inset-0.5 bg-linear-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            <div className="relative glass-card rounded-xl p-4 h-full bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-yellow-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-linear-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 backdrop-blur-sm shrink-0">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Yayın Tarihi</p>
                  <p className="text-xs font-semibold text-white">{detail.publishDate || '-'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative group h-full"
          >
            <div className="absolute -inset-0.5 bg-linear-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            <div className="relative glass-card rounded-xl p-4 h-full bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-green-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-linear-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 backdrop-blur-sm shrink-0">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Kısmi Teklif</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold border backdrop-blur-sm w-fit ${
                    detail.partialBidAllowed
                      ? 'bg-linear-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30'
                      : 'bg-linear-to-r from-gray-500/20 to-gray-600/20 text-gray-300 border-gray-500/30'
                  }`}>
                    {detail.partialBidAllowed ? '✓ Verilebilir' : '✗ Verilemez'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {detail.publishDate && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative group h-full"
            >
              <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              <div className="relative glass-card rounded-xl p-4 h-full bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm shrink-0">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Yayınlanma</p>
                    <p className="text-xs font-semibold text-slate-200">{detail.publishDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {detail.tenderDate && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative group h-full"
            >
              <div className="absolute -inset-0.5 bg-linear-to-r from-red-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              <div className="relative glass-card rounded-xl p-4 h-full bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-red-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-linear-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 backdrop-blur-sm shrink-0">
                    <Calendar className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Son Teklif</p>
                    <p className="text-xs font-bold text-indigo-400">{detail.tenderDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* AI Parsed Data - Ayrı Ayrı Kartlar */}
        {detail.ai_parsed && (
          <div className="mb-6 relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* 1. İHALE BİLGİLERİ - Ayrı Kart */}
              {detail.ai_parsed && typeof detail.ai_parsed === 'object' && 'sections' in detail.ai_parsed && (detail.ai_parsed as AIParsedData).sections && (
                (detail.ai_parsed as AIParsedData).sections!
                  .filter((section: AIParsedSection) => section.category === 'İhale Bilgileri')
                  .map((section: AIParsedSection, idx: number) => (
        <motion.div 
                      key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className="relative group z-20"
                    >
                      <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                      <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-indigo-500/30 shadow-xl shadow-black/30 overflow-hidden z-20">
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                              <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                            <div>
                              <h3 className="text-base font-semibold text-indigo-300">İhale Bilgileri</h3>
                              <p className="text-xs text-slate-400 mt-0.5">{section.items?.length || 0} bilgi</p>
                            </div>
                          </div>
                          {(() => {
                            const items = section.items || [];
                            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                            const startIdx = (ihaleBilgileriPage - 1) * ITEMS_PER_PAGE;
                            const endIdx = startIdx + ITEMS_PER_PAGE;
                            const paginatedItems = items.slice(startIdx, endIdx);
                            
                            return (
                              <>
                                <div className="grid grid-cols-1 gap-3 mb-4">
                                  {paginatedItems.map((item: { key: string; value: string }, itemIdx: number) => (
                                    <div key={itemIdx} className="flex flex-col gap-1 p-3 rounded-lg bg-slate-700/40 border border-slate-600/40 hover:bg-slate-700/60 transition-colors">
                                      <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                                      <span className="text-sm text-slate-200 font-semibold">{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                      <button
                                      onClick={() => setIhaleBilgileriPage(p => Math.max(1, p - 1))}
                                      disabled={ihaleBilgileriPage === 1}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                      <span>Önceki</span>
                      </button>
                                    
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                          pageNum = i + 1;
                                        } else if (ihaleBilgileriPage <= 3) {
                                          pageNum = i + 1;
                                        } else if (ihaleBilgileriPage >= totalPages - 2) {
                                          pageNum = totalPages - 4 + i;
                                        } else {
                                          pageNum = ihaleBilgileriPage - 2 + i;
                                        }
                                        
                                        return (
                                          <button
                                            key={pageNum}
                                            onClick={() => setIhaleBilgileriPage(pageNum)}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                              ihaleBilgileriPage === pageNum
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                                            }`}
                                          >
                                            {pageNum}
                                          </button>
                                        );
                                      })}
                      </div>

                                    <button
                                      onClick={() => setIhaleBilgileriPage(p => Math.min(totalPages, p + 1))}
                                      disabled={ihaleBilgileriPage === totalPages}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                                    >
                                      <span>Sonraki</span>
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                              </div>
                                    </div>
                            </motion.div>
                          ))
                      )}

              {/* 2. İDARE BİLGİLERİ - Ayrı Kart */}
                      {detail.ai_parsed && typeof detail.ai_parsed === 'object' && 'sections' in detail.ai_parsed && (detail.ai_parsed as AIParsedData).sections && (
                        (detail.ai_parsed as AIParsedData).sections!
                          .filter((section: AIParsedSection) => section.category === 'İdare Bilgileri')
                          .map((section: AIParsedSection, idx: number) => (
                            <motion.div 
                              key={idx}
                      initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className="relative group z-20"
                    >
                      <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                      <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-blue-500/30 shadow-xl shadow-black/30 overflow-hidden z-20">
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-linear-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                              <FileText className="w-5 h-5 text-blue-400" />
                              </div>
                            <div>
                              <h3 className="text-base font-semibold text-blue-300">İdare Bilgileri</h3>
                              <p className="text-xs text-slate-400 mt-0.5">{section.items?.length || 0} bilgi</p>
                            </div>
                          </div>
                          {(() => {
                            const items = section.items || [];
                            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                            const startIdx = (idareBilgileriPage - 1) * ITEMS_PER_PAGE;
                            const endIdx = startIdx + ITEMS_PER_PAGE;
                            const paginatedItems = items.slice(startIdx, endIdx);
                            
                            return (
                              <>
                                <div className="grid grid-cols-1 gap-3 mb-4">
                                  {paginatedItems.map((item: { key: string; value: string }, itemIdx: number) => (
                                    <div key={itemIdx} className="flex flex-col gap-1 p-3 rounded-lg bg-slate-700/40 border border-slate-600/40 hover:bg-slate-700/60 transition-colors">
                                          <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                                      <span className="text-sm text-slate-200 font-semibold">{item.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                                    <button
                                      onClick={() => setIdareBilgileriPage(p => Math.max(1, p - 1))}
                                      disabled={idareBilgileriPage === 1}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                      <span>Önceki</span>
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                          pageNum = i + 1;
                                        } else if (idareBilgileriPage <= 3) {
                                          pageNum = i + 1;
                                        } else if (idareBilgileriPage >= totalPages - 2) {
                                          pageNum = totalPages - 4 + i;
                                        } else {
                                          pageNum = idareBilgileriPage - 2 + i;
                                        }
                                        
                                        return (
                                          <button
                                            key={pageNum}
                                            onClick={() => setIdareBilgileriPage(pageNum)}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                              idareBilgileriPage === pageNum
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                                            }`}
                                          >
                                            {pageNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    <button
                                      onClick={() => setIdareBilgileriPage(p => Math.min(totalPages, p + 1))}
                                      disabled={idareBilgileriPage === totalPages}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                                    >
                                      <span>Sonraki</span>
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                            </motion.div>
                          ))
                      )}
            </div>

            {/* 3. İHALE İLANI - Full Width Kart */}
                      {detail.ai_parsed && typeof detail.ai_parsed === 'object' && 'textContent' in detail.ai_parsed && (detail.ai_parsed as any).textContent && (detail.ai_parsed as any).textContent.length > 0 && (
                        <motion.div
                initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className="relative group mb-6 z-20"
              >
                <div className="absolute -inset-0.5 bg-linear-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-green-500/30 shadow-xl shadow-black/30 overflow-hidden z-20">
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-green-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-linear-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                        <FileText className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-green-300">İhale İlanı</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{(detail.ai_parsed as any).textContent.length} paragraf</p>
                      </div>
                    </div>
                    {(() => {
                      const textContent = (detail.ai_parsed as any).textContent || [];
                      const totalPages = Math.ceil(textContent.length / ITEMS_PER_PAGE);
                      const startIdx = (ihaleIlaniPage - 1) * ITEMS_PER_PAGE;
                      const endIdx = startIdx + ITEMS_PER_PAGE;
                      const paginatedText = textContent.slice(startIdx, endIdx);
                      
                      return (
                        <>
                          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/40 mb-4">
                            <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                              {paginatedText.join('\n\n')}
                            </pre>
                          </div>
                          
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                              <button
                                onClick={() => setIhaleIlaniPage(p => Math.max(1, p - 1))}
                                disabled={ihaleIlaniPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Önceki</span>
                              </button>
                              
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (ihaleIlaniPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (ihaleIlaniPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = ihaleIlaniPage - 2 + i;
                                  }
                                  
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => setIhaleIlaniPage(pageNum)}
                                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        ihaleIlaniPage === pageNum
                                          ? 'bg-green-500 text-white'
                                          : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}
                          </div>
                              
                              <button
                                onClick={() => setIhaleIlaniPage(p => Math.min(totalPages, p + 1))}
                                disabled={ihaleIlaniPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-300"
                              >
                                <span>Sonraki</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                                </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                        </motion.div>
                      )}

            {/* 4. MAL/HİZMET LİSTESİ - Full Width Kart */}
                      {detail.ai_parsed && typeof detail.ai_parsed === 'object' && 'tables' in detail.ai_parsed && (detail.ai_parsed as any).tables && (detail.ai_parsed as any).tables.length > 0 && (
                        <motion.div
                initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className="relative group mb-6 z-20"
              >
                <div className="absolute -inset-0.5 bg-linear-to-r from-orange-500/20 to-red-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-orange-500/30 shadow-xl shadow-black/30 overflow-hidden z-20">
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-orange-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-linear-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                        <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                          </div>
                      <div>
                        <h3 className="text-base font-semibold text-orange-300">Mal/Hizmet Listesi</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{(detail.ai_parsed as AIParsedData).tables?.length || 0} tablo</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                                  {(detail.ai_parsed as AIParsedData).tables?.map((table: AIParsedTable, tableIdx: number) => (
                        <div key={tableIdx} className="bg-slate-700/60 rounded-lg p-4 border border-slate-600/50 overflow-x-auto">
                                      {table.title && (
                            <h5 className="text-sm font-semibold text-slate-300 mb-3">{table.title}</h5>
                                      )}
                                      {table.headers && table.headers.length > 0 && (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-slate-700 bg-slate-700/30">
                                              {table.headers.map((header: string, hIdx: number) => (
                                                <th key={hIdx} className="text-left p-2 text-slate-300 font-semibold">{header}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {table.rows?.map((row: string[], rowIdx: number) => (
                                              <tr key={rowIdx} className="border-b border-slate-800/50 hover:bg-slate-700/20 transition-colors">
                                                {row.map((cell: string, cellIdx: number) => (
                                                  <td key={cellIdx} className="p-2 text-slate-200">{cell}</td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  ))}
                    </div>
                  </div>
                                </div>
                        </motion.div>
                      )}
                    </div>
                  )}

        {/* Birebir Görünüm - Accordion (Varsayılan Kapalı) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative group mb-6"
        >
          <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          <div className="relative glass-card rounded-xl overflow-hidden bg-linear-to-br from-slate-800/70 via-slate-700/60 to-slate-800/70 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/30">
            <div 
              onClick={() => setBirebirGorunumExpanded(!birebirGorunumExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-800/30 transition-all duration-300 cursor-pointer border-b border-slate-700/30"
            >
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                </div>
                Birebir Görünüm
              </h2>
              {birebirGorunumExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              )}
            </div>
            <AnimatePresence>
              {birebirGorunumExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                  {detail.html_iframe ? (
                      <ReplicaFrame
                        html={String(detail.html_iframe)}
                        title="İhale Detayları - Birebir Görünüm"
                      />
                    ) : detail.html_raw ? (
                      <ReplicaFrame
                        html={String(detail.html_raw)}
                        title="İhale Detayları - Birebir Görünüm"
                      />
                    ) : (
                      <div className="p-6 bg-linear-to-br from-slate-800/40 to-slate-900/40 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                        <p className="text-slate-400 text-sm">Birebir görünüm yükleniyor...</p>
                      </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Export Section - Premium */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="relative group mb-6"
          style={{ overflow: 'visible' }}
        >
          <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <div className="p-2 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm">
                  <Download className="w-4 h-4 text-indigo-400" />
                </div>
                İhale ilanı ve Mal/Hizmet Listesi
              </h2>
              {selectedDataFormats.size > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-3 py-1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs rounded-full font-semibold border border-indigo-500/30 backdrop-blur-sm"
                >
                  {selectedDataFormats.size} Seçili
                </motion.span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* TXT Export */}
            <div className="space-y-2 relative">
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedDataFormats.has('txt')
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-700/50 hover:border-blue-500/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('TXT format clicked, current state:', Array.from(selectedDataFormats));
                  setSelectedDataFormats(prev => {
                    const next = new Set(prev);
                    if (next.has('txt')) {
                      next.delete('txt');
                      console.log('Removed txt, new state:', Array.from(next));
                    } else {
                      next.add('txt');
                      console.log('Added txt, new state:', Array.from(next));
                    }
                    return next;
                  });
                }}
              >
                <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center backdrop-blur-sm transition-all relative ${
                  selectedDataFormats.has('txt')
                    ? 'bg-linear-to-br from-blue-500/30 to-cyan-500/30 border-blue-500/50 shadow-md shadow-blue-500/20'
                    : 'bg-linear-to-br from-slate-800/60 to-slate-700/60 border-slate-700/50 group-hover/item:border-blue-500/50'
                }`}>
                  <FileType className="w-5 h-5 text-blue-400" />
                  {selectedDataFormats.has('txt') && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                      <CheckSquare className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                        <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 relative">
                    <p className="text-sm font-medium text-blue-300">
                            Metin İçerik (TXT)
                          </p>
                    <div className="relative group">
                      <button
                        ref={(el) => { hoverButtonRefs.current['txt'] = el; }}
                        onMouseEnter={async (e) => {
                          e.stopPropagation();
                          const button = e.currentTarget;
                          const rect = button.getBoundingClientRect();
                          // Adjust position to prevent overflow
                          const popupWidth = 700;
                          const adjustedX = Math.min(rect.left, window.innerWidth - popupWidth - 20);
                          setHoverPosition({ x: Math.max(20, adjustedX), y: rect.bottom + 8 });
                          if (!hoverContent && hoverFormat !== 'txt') {
                            setLoadingHover(true);
                            setHoverFormat('txt');
                            try {
                              const res = await fetch(`/api/ihale/export-csv/${id}?format=txt`);
                              const text = await res.text();
                              setHoverContent(text);
                            } catch {
                              setHoverContent('Önizleme yüklenemedi');
                            } finally {
                              setLoadingHover(false);
                            }
                          } else {
                            setHoverFormat('txt');
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          // Delay kapatma, popup'a geçiş için zaman tanı
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoverFormat(null);
                            setHoverContent('');
                            setHoverPosition(null);
                          }, 200);
                        }}
                        className="bg-transparent border-0 shadow-none p-0 m-0 hover:bg-transparent focus:outline-none focus:ring-0"
                        title="Önizle"
                      >
                        <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                          <p className="text-xs text-blue-500/70">
                            Özet + key-value bilgileri + paragraflar
                          </p>
                        </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const exportKey = `export-txt-${id}`;
                    const isDownloading = downloadingFiles.has(exportKey);
                    
                    const handleExport = (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      if (isDownloading) return;
                      
                      setDownloadingFiles(prev => new Set(prev).add(exportKey));
                      const link = document.createElement('a');
                      link.href = `/api/ihale/export-csv/${id}?format=txt`;
                      link.download = 'ihale-detay.txt';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setTimeout(() => {
                        setDownloadingFiles(prev => {
                          const next = new Set(prev);
                          next.delete(exportKey);
                          return next;
                        });
                      }, 2000);
                    };
                    
                    return (
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={isDownloading}
                        className={`p-2 rounded-lg transition-colors ${
                          isDownloading
                            ? 'opacity-50 cursor-not-allowed text-slate-500'
                            : 'hover:bg-blue-500/30 text-blue-400'
                        }`}
                        title={isDownloading ? "İndiriliyor..." : "İndir"}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
              {/* Preview */}
              {previewFormat === 'txt' && (
                <div className="bg-slate-900/50 border border-blue-500/30 rounded-lg p-4 max-h-64 overflow-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-400">TXT Önizleme</span>
                    <button
                      onClick={() => {
                        setPreviewFormat(null);
                        setPreviewContent('');
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  ) : (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{previewContent}</pre>
                  )}
                </div>
              )}
            </div>

                      {/* CSV Export - Premium */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="space-y-2 relative group/item"
            >
              <div className="absolute -inset-0.5 bg-linear-to-r from-emerald-500/20 to-green-500/20 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 -z-10"></div>
              <div
                className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer overflow-hidden backdrop-blur-sm ${
                  selectedDataFormats.has('csv')
                    ? 'bg-linear-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                    : 'bg-linear-to-br from-slate-900/60 to-slate-800/60 hover:from-slate-800/60 hover:to-slate-700/60 border-slate-700/50 hover:border-emerald-500/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('CSV format clicked, current state:', Array.from(selectedDataFormats));
                  setSelectedDataFormats(prev => {
                    const next = new Set(prev);
                    if (next.has('csv')) {
                      next.delete('csv');
                      console.log('Removed csv, new state:', Array.from(next));
                    } else {
                      next.add('csv');
                      console.log('Added csv, new state:', Array.from(next));
                    }
                    return next;
                  });
                }}
              >
                <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center backdrop-blur-sm transition-all relative ${
                  selectedDataFormats.has('csv')
                    ? 'bg-linear-to-br from-emerald-500/30 to-green-500/30 border-emerald-500/50 shadow-md shadow-emerald-500/20'
                    : 'bg-linear-to-br from-slate-800/60 to-slate-700/60 border-slate-700/50 group-hover/item:border-emerald-500/50'
                }`}>
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  {selectedDataFormats.has('csv') && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                      <CheckSquare className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                        <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 relative">
                    <p className="text-sm font-medium text-emerald-300">
                            Tablolar (CSV)
                          </p>
                    <div className="relative group">
                      <button
                        ref={(el) => { hoverButtonRefs.current['csv'] = el; }}
                        onMouseEnter={async (e) => {
                          e.stopPropagation();
                          const button = e.currentTarget;
                          const rect = button.getBoundingClientRect();
                          // Adjust position to prevent overflow
                          const popupWidth = 700;
                          const adjustedX = Math.min(rect.left, window.innerWidth - popupWidth - 20);
                          setHoverPosition({ x: Math.max(20, adjustedX), y: rect.bottom + 8 });
                          if (!hoverContent && hoverFormat !== 'csv') {
                            setLoadingHover(true);
                            setHoverFormat('csv');
                            try {
                              const res = await fetch(`/api/ihale/export-csv/${id}?format=csv`);
                              const text = await res.text();
                              setHoverContent(text);
                            } catch {
                              setHoverContent('Önizleme yüklenemedi');
                            } finally {
                              setLoadingHover(false);
                            }
                          } else {
                            setHoverFormat('csv');
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          // Delay kapatma, popup'a geçiş için zaman tanı
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoverFormat(null);
                            setHoverContent('');
                            setHoverPosition(null);
                          }, 200);
                        }}
                        className="bg-transparent border-0 shadow-none p-0 m-0 hover:bg-transparent focus:outline-none focus:ring-0"
                        title="Önizle"
                      >
                        <Eye className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                          <p className="text-xs text-emerald-500/70">
                            Tüm tablolar Excel formatında
                          </p>
                        </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const exportKey = `export-csv-${id}`;
                    const isDownloading = downloadingFiles.has(exportKey);
                    
                    const handleExport = (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      if (isDownloading) return;
                      
                      setDownloadingFiles(prev => new Set(prev).add(exportKey));
                      const link = document.createElement('a');
                      link.href = `/api/ihale/export-csv/${id}?format=csv`;
                      link.download = 'ihale-detay.csv';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setTimeout(() => {
                        setDownloadingFiles(prev => {
                          const next = new Set(prev);
                          next.delete(exportKey);
                          return next;
                        });
                      }, 2000);
                    };
                    
                    return (
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={isDownloading}
                        className={`p-2 rounded-lg transition-colors ${
                          isDownloading
                            ? 'opacity-50 cursor-not-allowed text-slate-500'
                            : 'hover:bg-emerald-500/30 text-emerald-400'
                        }`}
                        title={isDownloading ? "İndiriliyor..." : "İndir"}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
              {/* Preview */}
              {previewFormat === 'csv' && (
                <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4 max-h-64 overflow-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400">CSV Önizleme</span>
                    <button
                      onClick={() => {
                        setPreviewFormat(null);
                        setPreviewContent('');
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    </div>
                  ) : (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{previewContent}</pre>
                  )}
                </div>
              )}
            </motion.div>

                      {/* JSON Export - Premium */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="space-y-2 relative group/item"
            >
              <div className="absolute -inset-0.5 bg-linear-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 -z-10"></div>
              <div
                className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer overflow-hidden backdrop-blur-sm ${
                  selectedDataFormats.has('json')
                    ? 'bg-linear-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'bg-linear-to-br from-slate-900/60 to-slate-800/60 hover:from-slate-800/60 hover:to-slate-700/60 border-slate-700/50 hover:border-purple-500/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('JSON format clicked, current state:', Array.from(selectedDataFormats));
                  setSelectedDataFormats(prev => {
                    const next = new Set(prev);
                    if (next.has('json')) {
                      next.delete('json');
                      console.log('Removed json, new state:', Array.from(next));
                    } else {
                      next.add('json');
                      console.log('Added json, new state:', Array.from(next));
                    }
                    return next;
                  });
                }}
              >
                <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center backdrop-blur-sm transition-all relative ${
                  selectedDataFormats.has('json')
                    ? 'bg-linear-to-br from-purple-500/30 to-pink-500/30 border-purple-500/50 shadow-md shadow-purple-500/20'
                    : 'bg-linear-to-br from-slate-800/60 to-slate-700/60 border-slate-700/50 group-hover/item:border-purple-500/50'
                }`}>
                  <FileJson className="w-5 h-5 text-purple-400" />
                  {selectedDataFormats.has('json') && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                      <CheckSquare className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                        <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 relative">
                    <p className="text-sm font-medium text-purple-300">
                            Tüm Veriler (JSON)
                          </p>
                    <div className="relative group">
                      <button
                        ref={(el) => { hoverButtonRefs.current['json'] = el; }}
                        onMouseEnter={async (e) => {
                          e.stopPropagation();
                          const button = e.currentTarget;
                          const rect = button.getBoundingClientRect();
                          // Adjust position to prevent overflow
                          const popupWidth = 700;
                          const adjustedX = Math.min(rect.left, window.innerWidth - popupWidth - 20);
                          setHoverPosition({ x: Math.max(20, adjustedX), y: rect.bottom + 8 });
                          if (!hoverContent && hoverFormat !== 'json') {
                            setLoadingHover(true);
                            setHoverFormat('json');
                            try {
                              const res = await fetch(`/api/ihale/export-csv/${id}?format=json`);
                              const text = await res.text();
                              // JSON'u formatla
                              try {
                                const json = JSON.parse(text);
                                setHoverContent(JSON.stringify(json, null, 2));
                              } catch {
                                setHoverContent(text);
                              }
                            } catch {
                              setHoverContent('Önizleme yüklenemedi');
                            } finally {
                              setLoadingHover(false);
                            }
                          } else {
                            setHoverFormat('json');
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          // Delay kapatma, popup'a geçiş için zaman tanı
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoverFormat(null);
                            setHoverContent('');
                            setHoverPosition(null);
                          }, 200);
                        }}
                        className="bg-transparent border-0 shadow-none p-0 m-0 hover:bg-transparent focus:outline-none focus:ring-0"
                        title="Önizle"
                      >
                        <Eye className="w-4 h-4 text-slate-400 hover:text-purple-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                          <p className="text-xs text-purple-500/70">
                            Sections + tables + text (programmatic kullanım)
                          </p>
                        </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const exportKey = `export-json-${id}`;
                    const isDownloading = downloadingFiles.has(exportKey);
                    
                    const handleExport = (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      if (isDownloading) return;
                      
                      setDownloadingFiles(prev => new Set(prev).add(exportKey));
                      const link = document.createElement('a');
                      link.href = `/api/ihale/export-csv/${id}?format=json`;
                      link.download = 'ihale-detay.json';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setTimeout(() => {
                        setDownloadingFiles(prev => {
                          const next = new Set(prev);
                          next.delete(exportKey);
                          return next;
                        });
                      }, 2000);
                    };
                    
                    return (
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={isDownloading}
                        className={`p-2 rounded-lg transition-colors ${
                          isDownloading
                            ? 'opacity-50 cursor-not-allowed text-slate-500'
                            : 'hover:bg-purple-500/30 text-purple-400'
                        }`}
                        title={isDownloading ? "İndiriliyor..." : "İndir"}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
              {/* Preview */}
              {previewFormat === 'json' && (
                <div className="bg-slate-900/50 border border-purple-500/30 rounded-lg p-4 max-h-64 overflow-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-400">JSON Önizleme</span>
                    <button
                      onClick={() => {
                        setPreviewFormat(null);
                        setPreviewContent('');
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{previewContent}</pre>
                  )}
                </div>
              )}
            </motion.div>
            </div>
          </div>
        </motion.div>

        {/* İhale Dokümanları */}
        {(() => {
          // Remove duplicates based on URL, but keep track of all occurrences
          const seenUrls = new Set<string>();
          
          // Filter out ZIP files (they're replaced by extracted contents)
          // Normalize documents: ensure they have required fields
          const normalizedDocs = (detail?.documents || []).map((doc: DocumentType & { title?: string; filename?: string; fileType?: string }) => ({
            url: doc.url || '',
            filename: doc.filename || doc.name || doc.title || '',
            name: doc.name || doc.filename || doc.title || '',
            title: doc.title || doc.name || doc.filename || '',
            fileType: (doc.fileType || '').toLowerCase() || undefined
          }));
          
          const regularDocuments = normalizedDocs.filter((doc: DocumentType) => {
            // Check if it's a ZIP file
            const isZip = doc.fileType === 'zip' || 
                         (typeof doc.filename === 'string' && doc.filename.toLowerCase().endsWith('.zip')) ||
                         (typeof doc.name === 'string' && doc.name.toLowerCase().endsWith('.zip')) ||
                         (typeof doc.url === 'string' && doc.url.toLowerCase().includes('.zip'));
            
            // Skip ZIP files - they'll be replaced by extracted contents (but only if we have expandedDocuments)
            // If ZIP extraction hasn't happened yet or failed, show the ZIP file itself
            if (isZip) {
              // Only skip if we have expanded documents from this ZIP
              const zipUrl = doc.url || '';
              const hasExtracted = expandedDocuments.some(exp => {
                const expZipUrl = (exp as DocumentType & { _zipUrl?: string })._zipUrl;
                return expZipUrl === zipUrl;
              });
              
              if (hasExtracted) {
                return false;
              } else {
                // Show ZIP file if extraction hasn't happened or failed
                if (doc.url && !seenUrls.has(doc.url)) {
                  seenUrls.add(doc.url);
                  return true;
                }
                return false;
              }
            }
            
            if (!doc.url) {
              return true; // Keep docs without URL
            }
            if (seenUrls.has(doc.url)) {
              return false; // Skip duplicate
            }
            seenUrls.add(doc.url);
            return true;
          });
          
          // First, collect filenames from ZIP-extracted documents (prioritize these)
          const zipExtractedFilenames = new Set<string>();
          expandedDocuments.forEach((doc: DocumentType) => {
            const filenameStr = doc.filename || doc.name || doc.title;
            if (typeof filenameStr === 'string') {
              zipExtractedFilenames.add(filenameStr.toLowerCase().trim());
            }
          });
          
          // Combine: ZIP-extracted first, then regular (excluding duplicates)
          const finalSeenUrls = new Set<string>();
          const isZipProcessing = loadingZip.size > 0;
          const uniqueDocuments: DocumentType[] = [];
          
          // Add ZIP-extracted documents first
          expandedDocuments.forEach((doc: DocumentType) => {
            const url = doc.url || '';
            if (url && finalSeenUrls.has(url)) return;
            finalSeenUrls.add(url);
            uniqueDocuments.push(doc);
          });
          
          // Add regular documents, but skip if filename exists in ZIP-extracted
          regularDocuments.forEach((doc: DocumentType) => {
            const url = doc.url || '';
            const filenameStr = doc.filename || doc.name || doc.title;
            const filename = typeof filenameStr === 'string' 
              ? filenameStr.toLowerCase().trim() 
              : '';
            
            // Skip if URL already seen
            if (url && finalSeenUrls.has(url)) {
              return;
            }
            
            // Skip if filename exists in ZIP-extracted documents
            if (filename && zipExtractedFilenames.has(filename)) {
              return;
            }
            
            // Add to seen sets and list
            if (url) finalSeenUrls.add(url);
            uniqueDocuments.push(doc);
          });

          if (uniqueDocuments.length === 0 && expandedDocuments.length === 0) {
            return null;
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="relative group mb-6"
            >
              <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              <div className="relative glass-card rounded-xl p-5 bg-linear-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm">
                      <FileText className="w-4 h-4 text-indigo-400" />
                    </div>
                    İhale Dokümanları
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedDocuments.size > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs rounded-full font-semibold border border-indigo-500/30 backdrop-blur-sm"
                      >
                        {selectedDocuments.size} Seçili
                      </motion.span>
                    )}
                    {uniqueDocuments.length > 1 && (
                      <button
                        onClick={() => {
                          if (selectedDocuments.size === uniqueDocuments.length) {
                            // Deselect all
                            setSelectedDocuments(new Set());
                          } else {
                            // Select all - use same logic as in map to generate keys
                            const allKeys = uniqueDocuments.map((doc: DocumentType, i: number) => {
                              const filename = doc.filename || doc.name || doc.title || '';
                              const url = typeof doc.url === 'string' ? doc.url : '';
                              return doc._fromZip && typeof doc.url === 'string' && doc.url.startsWith('zip:')
                                ? doc.url
                                : `doc-${i}-${url}-${filename}`;
                            });
                            setSelectedDocuments(new Set(allKeys));
                          }
                        }}
                        className="px-3 py-1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 text-xs rounded-full font-semibold border border-indigo-500/30 backdrop-blur-sm transition-all"
                      >
                        {selectedDocuments.size === uniqueDocuments.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      {loadingZip.size > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>ZIP açılıyor...</span>
                        </div>
                      )}
                      <span className="px-3 py-1 bg-linear-to-r from-slate-500/20 to-slate-600/20 text-slate-300 text-xs rounded-full font-semibold border border-slate-500/30 backdrop-blur-sm">
                        {uniqueDocuments.length} Dosya
                      </span>
                    </div>
                  </div>
                </div>
              <div className="grid grid-cols-1 gap-3 mb-4">
                  {/* Info message for ZIP extracted files */}
                  {expandedDocuments.length > 0 && (
                    <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded bg-purple-500/20">
                          <FileText className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-purple-300 mb-1">
                            ZIP Dosyaları Açıldı
                          </p>
                          <p className="text-xs text-purple-400/80">
                            {expandedDocuments.length} dosya ZIP içinden çıkarıldı ve aşağıda listeleniyor.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {uniqueDocuments.map((doc: DocumentType, i: number) => {
                  // Create stable unique ID: use index + URL + filename to ensure uniqueness
                  // Index is stable across renders, so this will be consistent
                  const filename = doc.filename || doc.name || doc.title || '';
                  const url = typeof doc.url === 'string' ? doc.url : '';
                  
                  // For ZIP extracted files, use the special URL format if available
                  // Otherwise create a stable ID based on index + filename
                  const selectionKey = doc._fromZip && typeof doc.url === 'string' && doc.url.startsWith('zip:')
                    ? doc.url // Use zip:ZIP_URL#PATH format for ZIP extracted files
                    : `doc-${i}-${url}-${filename}`; // Stable ID: index + URL + filename
                  
                  // Use same key for React key prop
                  const docId = selectionKey;
                  const isSelected = selectedDocuments.has(selectionKey);
                  
                    // Helper to get file type icon color and background
                    const getFileTypeColor = (type?: string) => {
                      const t = (type || '').toLowerCase();
                      if (t === 'pdf') {
                        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
                      }
                      if (t === 'docx' || t === 'doc') {
                        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
                      }
                      if (t === 'xlsx' || t === 'xls') {
                        return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' };
                      }
                      if (t === 'zip' || t === 'rar') {
                        return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
                      }
                      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
                    };

                    const fileType = typeof doc.fileType === 'string' ? doc.fileType : undefined;
                    const colors = getFileTypeColor(fileType);

                    return (
                    <div
                        key={docId}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-all group ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/50'
                          : 'bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50 hover:border-indigo-500/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocuments(prev => {
                            const next = new Set(prev);
                            if (next.has(selectionKey)) {
                              next.delete(selectionKey);
                              console.log('📄 Document deselected:', { selectionKey, filename, url, index: i, totalSelected: next.size });
                            } else {
                              next.add(selectionKey);
                              console.log('📄 Document selected:', { selectionKey, filename, url, index: i, totalSelected: next.size });
                            }
                            return next;
                          });
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-slate-600 hover:border-indigo-500/50'
                        }`}
                      >
                        {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                      </button>

                      {/* File Icon */}
                        <div className={`shrink-0 w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                          {fileType ? (
                            <span className={`text-xs font-bold ${colors.text}`}>
                              {fileType}
                            </span>
                          ) : (
                            <FileText className={`w-5 h-5 ${colors.text}`} />
                          )}
                        </div>

                      {/* File Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                            {typeof doc.title === 'string' ? doc.title : (typeof doc.name === 'string' ? doc.name : 'Dosya')}
                          </p>
                          {typeof doc.filename === 'string' && doc.filename && (
                            <p className="text-xs text-slate-500 font-mono truncate">
                              {doc.filename}
                            </p>
                          )}
                        </div>

                      {/* Download Button */}
                      {(() => {
                        // Create unique download key for this file
                        const downloadUrl = doc._fromZip 
                          ? (typeof doc._zipUrl === 'string' ? doc._zipUrl : (typeof doc.url === 'string' ? doc.url : ''))
                          : (typeof doc.url === 'string' ? doc.url : '');
                        const downloadKey = `${downloadUrl}-${filename}`;
                        const isDownloading = downloadingFiles.has(downloadKey);

                        const handleDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          
                          // Prevent multiple clicks
                          if (isDownloading) {
                            return;
                          }

                          // Mark as downloading
                          setDownloadingFiles(prev => new Set(prev).add(downloadKey));

                          // Create a temporary link to trigger download
                          const link = document.createElement('a');
                          const url = doc._fromZip
                            ? `/api/ihale/proxy?url=${encodeURIComponent(downloadUrl)}&worker=true`
                            : `/api/ihale/proxy?url=${encodeURIComponent(downloadUrl)}&worker=true`;
                          
                          link.href = url;
                          link.download = typeof doc.filename === 'string' ? doc.filename : 'document';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          // Remove from downloading set after a delay (to prevent immediate re-click)
                          setTimeout(() => {
                            setDownloadingFiles(prev => {
                              const next = new Set(prev);
                              next.delete(downloadKey);
                              return next;
                            });
                          }, 2000); // 2 seconds cooldown
                        };

                        return doc._fromZip ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30">
                              ZIP içinden
                            </span>
                            <button
                              type="button"
                              onClick={handleDownload}
                              disabled={isDownloading}
                              className={`p-2 rounded-lg transition-colors ${
                                isDownloading
                                  ? 'opacity-50 cursor-not-allowed text-slate-500'
                                  : 'hover:bg-slate-700/50 text-slate-400 hover:text-indigo-400'
                              }`}
                              title={isDownloading ? "İndiriliyor..." : "ZIP'i İndir"}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Download className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`p-2 rounded-lg transition-colors ${
                              isDownloading
                                ? 'opacity-50 cursor-not-allowed text-slate-500'
                                : 'hover:bg-slate-700/50 text-slate-400 hover:text-indigo-400'
                            }`}
                            title={isDownloading ? "İndiriliyor..." : "İndir"}
                          >
                            {isDownloading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                    );
                  })}
          </div>

                {/* Analize Gönder Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                  {isZipProcessing && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ZIP dosyaları açılıyor, lütfen bekleyin...
                    </div>
                  )}
                  <Link
                    href="/analysis"
                    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-indigo-500/20 ${
                      selectedDocuments.size === 0 && selectedDataFormats.size === 0 || isZipProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={async (e) => {
                      if (isZipProcessing) {
                        e.preventDefault();
                        alert('ZIP dosyaları henüz hazırlanmadı. Lütfen açılmalarını bekleyin.');
                        return;
                      }
                      if (selectedDocuments.size === 0 && selectedDataFormats.size === 0) {
                        e.preventDefault();
                        alert('Lütfen en az bir döküman veya veri formatı seçin');
                        return;
                      }
                      // Seçili dökümanları ve formatları storage'a kaydet
                      // Filter out zip: scheme URLs (they are pseudo-URLs for extracted files)
                      // Extract actual URLs from selectionKeys by mapping back to uniqueDocuments
                      const selectedDocsArray = Array.from(selectedDocuments)
                        .filter(selectionKey => selectionKey && selectionKey.trim())
                        .map(selectionKey => {
                          if (selectionKey.startsWith('zip:')) {
                            return selectionKey;
                          }
                          // selectionKey format: "doc-${i}-${url}-${filename}"
                          // Extract index from the beginning
                          const match = selectionKey.match(/^doc-(\d+)-/);
                          if (match) {
                            const index = parseInt(match[1], 10);
                            const doc = uniqueDocuments[index];
                            if (doc && typeof doc.url === 'string') {
                              return doc.url; // Return original URL from document
                            }
                          }
                          // Fallback: try to extract URL manually
                          const httpsIndex = selectionKey.indexOf('https://');
                          const httpIndex = selectionKey.indexOf('http://');
                          const urlStart = httpsIndex !== -1 ? httpsIndex : httpIndex;
                          if (urlStart > 0) {
                            const rest = selectionKey.substring(urlStart);
                            const lastDashIndex = rest.lastIndexOf('-');
                            return lastDashIndex > 0 ? rest.substring(0, lastDashIndex) : rest;
                          }
                          return selectionKey;
                        });
                      const selectedFormatsArray = Array.from(selectedDataFormats);
                      const { storage } = await import('@/lib/storage/storage-manager');
                      storage.setTemp('ihaleSelectedDocs', {
                        tenderId: id,
                        documents: selectedDocsArray,
                        formats: selectedFormatsArray
                      });
                    }}
                  >
                    <Brain className="w-4 h-4" />
                    <span>
                      Analize Gönder
                      {(selectedDocuments.size > 0 || selectedDataFormats.size > 0) && 
                        ` (${selectedDocuments.size + selectedDataFormats.size})`
                      }
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Hover Preview Portal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {hoverFormat && hoverPosition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1] 
              }}
              className="fixed z-99999 w-[700px] max-w-[90vw] bg-slate-900 border rounded-lg p-6 max-h-[500px] overflow-auto shadow-2xl pointer-events-auto"
              style={{
                left: `${hoverPosition.x}px`,
                top: `${hoverPosition.y}px`,
                borderColor: hoverFormat === 'txt' ? 'rgba(59, 130, 246, 0.3)' : hoverFormat === 'csv' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'
              }}
              onMouseEnter={() => {
                // Keep popup open when hovering over it - cancel any pending close
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
              }}
              onMouseLeave={() => {
                // Close popup when leaving it
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                }
                hoverTimeoutRef.current = setTimeout(() => {
                  setHoverFormat(null);
                  setHoverContent('');
                  setHoverPosition(null);
                }, 200);
              }}
            >
              {loadingHover ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-5 h-5 animate-spin ${
                    hoverFormat === 'txt' ? 'text-blue-400' : hoverFormat === 'csv' ? 'text-emerald-400' : 'text-purple-400'
                  }`} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono wrap-break-word leading-relaxed m-0 max-w-full">{hoverContent}</pre>
                    </div>
                  )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
