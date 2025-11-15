import { AILogger } from "@/lib/ai/logger";
import {
  createOrchestration,
  updateOrchestration,
} from "@/lib/db/init-auth";
import {
  createJob,
  emitJob,
  postWithRetry,
} from "@/lib/jobs";
import { categorizeAIError, retryFormUpload } from "@/lib/utils/retry";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

/** Node runtime required for FormData + fetch self-calls */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Internal service URL resolution */
function resolveBaseURL(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    `${req.nextUrl.protocol}//${req.headers.get("host")}` ||
    "http://localhost:3001"
  );
}

/** API endpoints */
const API = {
  upload: "/api/ihale/upload",
  cost: "/api/ai/cost-analysis",
  decision: "/api/ai/decision",
  pdf: "/api/export/pdf",
  xlsx: "/api/export/xlsx",
};

export async function POST(req: NextRequest) {
  const base = resolveBaseURL(req);
  const contentType = req.headers.get("content-type") || "";
  const jobId = nanoid(10);

  // Create job in memory for SSE tracking
  createJob(jobId);

  // Return jobId immediately (202 Accepted)
  // Start async pipeline in background
  (async () => {
    let fileName = "unknown";
    const startTime = Date.now();

    try {
      emitJob(jobId, {
        step: "init",
        progress: 2,
        message: "Oto-pipeline başlatıldı",
      });
      AILogger.info("Orchestrator init", { jobId });

      // Create DB record
      createOrchestration(jobId, { fileName });
      updateOrchestration(jobId, {
        started_at: new Date().toISOString(),
        status: "running",
        current_step: "init",
      });

      let analysis: unknown = null;
      let cost: unknown = null;
      let decision: unknown = null;
      let pdfPath: string | null = null;
      let xlsxPath: string | null = null;

      /** STEP 1: INPUT - multipart (file) or json (analysis) */
      if (contentType.includes("multipart/form-data")) {
        emitJob(jobId, {
          step: "upload",
          progress: 8,
          message: "Doküman yükleniyor",
        });
        updateOrchestration(jobId, { 
          progress: 8, 
          status: "running",
          current_step: "upload" 
        });

        const form = await req.formData();
        const file = form.get("file") as File | null;

        if (!file) {
          throw new Error("Dosya bulunamadı");
        }

        fileName = file.name;

        // Upload → OCR → quick analysis
        emitJob(jobId, {
          step: "ocr",
          progress: 18,
          message: "OCR / Extract çalışıyor",
        });
        updateOrchestration(jobId, { 
          progress: 18, 
          status: "running",
          current_step: "ocr" 
        });

        const uploadForm = new FormData();
        uploadForm.append("file", file);

        const uploadResult = await retryFormUpload<{ data?: unknown; analysis?: unknown }>(
          new URL(API.upload, base).toString(),
          uploadForm,
          {
            maxAttempts: 3,
            onRetry: (attempt) => {
              emitJob(jobId, {
                step: "ocr",
                progress: 18 + attempt * 2,
                message: `OCR hatası, tekrar deneniyor (${attempt}/3)...`,
              });
            },
          }
        );

        if (!uploadResult.success || !uploadResult.data) {
          const errorInfo = categorizeAIError(uploadResult.error || "Upload başarısız");
          throw new Error(errorInfo.message);
        }

        analysis = uploadResult.data?.data || uploadResult.data?.analysis || null;

        if (!analysis) {
          throw new Error("Upload sonrası analiz verisi alınamadı");
        }

        emitJob(jobId, {
          step: "deep",
          progress: 30,
          message: "Derin analiz (Claude) tamamlandı",
          analysis,
        });
        updateOrchestration(jobId, { 
          progress: 30, 
          status: "running",
          current_step: "deep" 
        });
      } else {
        // JSON body (prepared analysis)
        const body = await req.json().catch(() => ({}));
        analysis = body?.analysis || body?.extracted_data || null;

        if (!analysis) {
          throw new Error("analysis veya extracted_data gereklidir");
        }

        emitJob(jobId, {
          step: "deep",
          progress: 30,
          message: "Hazır analiz verisi alındı",
          analysis,
        });
        updateOrchestration(jobId, { 
          progress: 30, 
          status: "running",
          current_step: "deep" 
        });
      }

      /** STEP 2: COST ANALYSIS */
      emitJob(jobId, {
        step: "cost",
        progress: 46,
        message: "Maliyet hesaplanıyor",
      });
      updateOrchestration(jobId, { 
        progress: 46, 
        status: "running",
        current_step: "cost" 
      });

      // Try with enhanced retry logic
      try {
        const costResult = (await postWithRetry(
          new URL(API.cost, base).toString(),
          { analysis },
          3
        )) as { data?: unknown; cost?: unknown };
        cost = costResult?.data || costResult?.cost || costResult;
      } catch (firstErr) {
        AILogger.warn("Cost analysis failed with 'analysis' payload, trying 'extracted_data'", { error: String(firstErr) });
        try {
          const costResult = (await postWithRetry(
            new URL(API.cost, base).toString(),
            { extracted_data: analysis },
            3
          )) as { data?: unknown; cost?: unknown };
          cost = costResult?.data || costResult?.cost || costResult;
        } catch (secondErr) {
          const errorInfo = categorizeAIError(secondErr);
          throw new Error(`Maliyet analizi başarısız: ${errorInfo.message}`);
        }
      }

      if (!cost) {
        throw new Error("Maliyet verisi alınamadı");
      }

      emitJob(jobId, {
        step: "cost",
        progress: 60,
        message: "Maliyet tamamlandı",
        cost,
      });
      updateOrchestration(jobId, { progress: 60, status: "cost" });

      /** STEP 3: DECISION ENGINE */
      emitJob(jobId, {
        step: "decision",
        progress: 72,
        message: "Karar motoru çalışıyor",
      });
      updateOrchestration(jobId, { 
        progress: 72, 
        status: "running",
        current_step: "decision" 
      });

      try {
        const decisionResult = (await postWithRetry(
          new URL(API.decision, base).toString(),
          { analysis, cost },
          3
        )) as { data?: unknown; decision?: unknown };

        decision = decisionResult?.data || decisionResult?.decision || decisionResult;

        if (!decision) {
          throw new Error("Karar verisi alınamadı");
        }
      } catch (error) {
        const errorInfo = categorizeAIError(error);
        throw new Error(`Karar motoru başarısız: ${errorInfo.message}`);
      }

      emitJob(jobId, {
        step: "decision",
        progress: 82,
        message: "Karar üretildi",
        decision,
      });
      updateOrchestration(jobId, { progress: 82, status: "decision" });

      /** STEP 4: REPORT GENERATION (PDF + XLSX) */
      emitJob(jobId, {
        step: "report",
        progress: 90,
        message: "Raporlar oluşturuluyor",
      });
      updateOrchestration(jobId, { progress: 90, status: "report" });

      // PDF Export (optional - don't fail if error)
      try {
        const pdfResult = (await postWithRetry(
          new URL(API.pdf, base).toString(),
          { analysis, cost, decision }
        )) as { path?: string };
        pdfPath = pdfResult?.path || null;
      } catch (error) {
        AILogger.warn("PDF rapor üretilemedi", {
          jobId,
          error: String(error),
        });
      }

      // XLSX Export (optional - don't fail if error)
      try {
        const xlsxResult = (await postWithRetry(
          new URL(API.xlsx, base).toString(),
          { analysis, cost, decision }
        )) as { path?: string };
        xlsxPath = xlsxResult?.path || null;
      } catch (error) {
        AILogger.warn("XLSX rapor üretilemedi", {
          jobId,
          error: String(error),
        });
      }

      /** STEP 5: DONE */
      const finalResult = { analysis, cost, decision, pdfPath, xlsxPath };
      const endTime = Date.now();
      const duration = endTime - startTime;

      emitJob(jobId, {
        step: "done",
        progress: 100,
        message: "Oto-pipeline tamamlandı",
        result: finalResult,
      });

      updateOrchestration(jobId, {
        progress: 100,
        status: "completed",
        current_step: "done",
        result: finalResult,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      AILogger.success("Orchestrator done", {
        jobId,
        fileName,
        pdfPath,
        xlsxPath,
        duration_ms: duration,
      });
    } catch (error: unknown) {
      const errorInfo = categorizeAIError(error);
      const errorMessage = errorInfo.message;
      const errorType = errorInfo.type;
      const recoverable = errorInfo.recoverable;

      emitJob(jobId, {
        step: "error",
        progress: 100,
        message: errorMessage,
        error: errorMessage,
        errorType,
        recoverable,
      });

      updateOrchestration(jobId, {
        status: "failed",
        current_step: "error",
        error: `[${errorType}] ${errorMessage}`,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });

      AILogger.error("Orchestrator error", {
        jobId,
        fileName,
        errorType,
        recoverable,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : String(error),
      });
    }
  })();

  return NextResponse.json({ success: true, jobId }, { status: 202 });
}
