"use client";

import { motion } from "framer-motion";
import {
    ArrowLeft,
    CheckCircle2,
    FileDown,
    FileSpreadsheet,
    History,
    Loader2,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LiveLogFeed } from "@/components/pipeline/LiveLogFeed";
import { PipelineTimeline, TimelineStep } from "@/components/pipeline/PipelineTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types for orchestration detail API
interface OrchestrationResult {
  analysis?: unknown;
  cost?: unknown;
  decision?: unknown;
  pdfPath?: string | null;
  xlsxPath?: string | null;
}

interface OrchestrationDetail {
  id: string;
  file_name?: string;
  mime_type?: string;
  status: "running" | "completed" | "failed" | "cancelled" | "pending" | string;
  progress?: number;
  current_step?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  steps_json?: string | null;
  result?: string | null;
  error?: string | null;
}

const MAX_JSON = 4000;

function pretty(obj: unknown) {
  try {
    const str = JSON.stringify(obj, null, 2) || "-";
    return str.length > MAX_JSON ? `${str.slice(0, MAX_JSON)}\n... (truncated)` : str;
  } catch (error) {
    return "-";
  }
}

export default function OrchestrationRunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrchestrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id;

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orchestrate/jobs/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.job) {
        setDetail(data.job);
      } else {
        throw new Error(data.error || "Job not found");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setError(msg);
      toast.error(`Kayıt alınamadı: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const statusColor = useMemo(() => {
    switch (detail?.status) {
      case "completed":
        return "bg-(--color-accent-mint)/20 text-(--color-accent-mint) border-(--color-accent-mint)/40";
      case "failed":
        return "bg-(--color-accent-red)/10 text-(--color-accent-red) border-(--color-accent-red)/40";
      case "running":
        return "bg-(--color-accent-blue)/10 text-(--color-accent-blue) border-(--color-accent-blue)/40";
      default:
        return "bg-(--color-surface) text-(--color-text-secondary) border-(--color-border)";
    }
  }, [detail?.status]);

  // Parse result and steps from JSON strings
  const parsedResult = useMemo(() => {
    if (!detail?.result) return null;
    try {
      return JSON.parse(detail.result) as OrchestrationResult;
    } catch (error) {
      return null;
    }
  }, [detail?.result]);

  const parsedSteps = useMemo((): TimelineStep[] => {
    if (!detail?.steps_json) {
      // Default steps if none stored
      return [
        { id: "upload", name: "Dosya Yükleme", status: "pending" },
        { id: "ocr", name: "OCR / Text Extraction", status: "pending" },
        { id: "deep", name: "Derin Analiz (Claude)", status: "pending" },
        { id: "cost", name: "Maliyet Hesaplama", status: "pending" },
        { id: "decision", name: "Karar Motoru", status: "pending" },
        { id: "report", name: "Rapor Oluşturma", status: "pending" },
      ];
    }
    try {
      return JSON.parse(detail.steps_json);
    } catch (error) {
      return [];
    }
  }, [detail?.steps_json]);

  // Actions
  const onBack = () => router.push("/auto/history");

  const onRetry = async () => {
    if (!detail) return;
    try {
      toast.info("Yeniden başlatılıyor...");
      const body: { analysis?: unknown } = {};
      if (parsedResult?.analysis) body.analysis = parsedResult.analysis;
      
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: body.analysis ? { "Content-Type": "application/json" } : undefined,
        body: body.analysis ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json?.jobId) throw new Error("Yeniden başlatma başarısız");
      toast.success("Yeni pipeline başlatıldı");
      router.push("/auto");
    } catch (error) {
      toast.error("Yeniden çalıştırılamadı");
    }
  };

  const onDelete = async () => {
    if (!detail || !confirm("Bu job'ı silmek istediğinizden emin misiniz?")) return;
    
    try {
      const res = await fetch(`/api/orchestrate/jobs/${detail.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      const data = await res.json();
      if (data.success) {
        toast.success("Kayıt silindi");
        router.push("/auto/history");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Silme işlemi başarısız: " + msg);
    }
  };

  return (
    <main className="min-h-screen p-3 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />} size="sm">
              Geri
            </Button>
            <h1 className="h1 text-lg sm:text-2xl">Pipeline Çalışması</h1>
            {detail?.status && (
              <Badge className={statusColor}>
                <History className="w-3 h-3 mr-1" />
                {detail.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button variant="secondary" onClick={fetchDetail} icon={<RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4" />} size="sm" className="flex-1 sm:flex-initial">
              Yenile
            </Button>
            <Button variant="secondary" onClick={onRetry} icon={<CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />} size="sm" className="flex-1 sm:flex-initial">
              Yeniden
            </Button>
            <Button variant="ghost" onClick={onDelete} icon={<Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />} size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1 sm:flex-initial">
              Sil
            </Button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="p-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
              Yükleniyor...
            </CardContent>
          </Card>
        )}
        {error && (
          <Card className="mb-6 border border-(--color-accent-red)/30 bg-(--color-accent-red)/5">
            <CardContent className="p-6">Hata: {error}</CardContent>
          </Card>
        )}

        {detail && !loading && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card variant="elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Dosya</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-2">
                  <p className="body-sm text-(--color-text-secondary) truncate text-xs sm:text-sm">
                    {detail.file_name || "-"}
                  </p>
                  <p className="body-xs text-(--color-text-tertiary)">{detail.mime_type || "-"}</p>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Süre</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-2">
                  <p className="body-sm text-(--color-text-secondary) text-xs sm:text-sm">
                    {((detail.duration_ms ?? 0) / 1000).toFixed(1)}s
                  </p>
                  <p className="body-xs text-(--color-text-tertiary)">
                    {detail.started_at
                      ? new Date(detail.started_at).toLocaleString("tr-TR")
                      : "-"}
                  </p>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Raporlar</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-2 flex gap-2 flex-wrap">
                  {parsedResult?.pdfPath ? (
                    <a href={parsedResult.pdfPath} download>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<FileDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                        className="text-xs sm:text-sm"
                      >
                        PDF
                      </Button>
                    </a>
                  ) : (
                    <Badge variant="neutral" className="text-xs">PDF yok</Badge>
                  )}
                  {parsedResult?.xlsxPath ? (
                    <a href={parsedResult.xlsxPath} download>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />}
                        className="text-xs sm:text-sm"
                      >
                        Excel
                      </Button>
                    </a>
                  ) : (
                    <Badge variant="neutral" className="text-xs">Excel yok</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timeline + Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card variant="elevated" className="order-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Pipeline Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-4 max-h-[400px] sm:max-h-[520px] overflow-y-auto">
                  <PipelineTimeline steps={parsedSteps} currentStep={detail.current_step || null} />
                </CardContent>
              </Card>

              <Card variant="elevated" className="h-[400px] sm:h-[520px] order-2">
                <LiveLogFeed jobId={detail.id} maxLogs={30} />
              </Card>
            </div>

            {/* Result JSONs */}
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Analiz Sonuçları</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="h4 mb-2 text-sm sm:text-base">Analiz</h3>
                    <pre className="text-xs bg-(--color-surface) border border-(--color-border) rounded-lg p-2 sm:p-3 max-h-60 sm:max-h-72 overflow-auto whitespace-pre-wrap">
                      {pretty(parsedResult?.analysis)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="h4 mb-2 text-sm sm:text-base">Maliyet</h3>
                    <pre className="text-xs bg-(--color-surface) border border-(--color-border) rounded-lg p-2 sm:p-3 max-h-60 sm:max-h-72 overflow-auto whitespace-pre-wrap">
                      {pretty(parsedResult?.cost)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="h4 mb-2 text-sm sm:text-base">Karar</h3>
                    <pre className="text-xs bg-(--color-surface) border border-(--color-border) rounded-lg p-2 sm:p-3 max-h-60 sm:max-h-72 overflow-auto whitespace-pre-wrap">
                      {pretty(parsedResult?.decision)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {detail.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className="border border-(--color-accent-red)/30 bg-(--color-accent-red)/5">
                  <CardContent className="p-6">
                    <h3 className="h4 text-(--color-accent-red) mb-2">Hata Detayı</h3>
                    <p className="body-sm text-(--color-text-secondary)">{detail.error}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
