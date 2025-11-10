import { AILogger } from "@/lib/ai/logger";
import {
    createOrchestration,
    updateOrchestration,
} from "@/lib/db/init-auth";
import {
    createJob,
    emitJob,
    postFormDataWithRetry,
    postWithRetry,
} from "@/lib/jobs";
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

    try {
      emitJob(jobId, {
        step: "init",
        progress: 2,
        message: "Oto-pipeline başlatıldı",
      });
      AILogger.info("Orchestrator init", { jobId });

      // Create DB record
      createOrchestration(jobId, fileName);

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
        updateOrchestration(jobId, { progress: 8, status: "upload" });

        const form = await req.formData();
        const file = form.get("file") as File | null;

        if (!file) {
          throw new Error("Dosya bulunamadı");
        }

        fileName = file.name;
        updateOrchestration(jobId, { progress: 8, status: "upload" });

        // Upload → OCR → quick analysis
        emitJob(jobId, {
          step: "ocr",
          progress: 18,
          message: "OCR / Extract çalışıyor",
        });
        updateOrchestration(jobId, { progress: 18, status: "ocr" });

        const uploadForm = new FormData();
        uploadForm.append("file", file);

        const uploadResult = (await postFormDataWithRetry(
          new URL(API.upload, base).toString(),
          uploadForm
        )) as { data?: unknown; analysis?: unknown };

        analysis = uploadResult?.data || uploadResult?.analysis || null;

        if (!analysis) {
          throw new Error("Upload sonrası analiz verisi alınamadı");
        }

        emitJob(jobId, {
          step: "deep",
          progress: 30,
          message: "Derin analiz (Claude) tamamlandı",
          analysis,
        });
        updateOrchestration(jobId, { progress: 30, status: "analyze" });
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
        updateOrchestration(jobId, { progress: 30, status: "analyze" });
      }

      /** STEP 2: COST ANALYSIS */
      emitJob(jobId, {
        step: "cost",
        progress: 46,
        message: "Maliyet hesaplanıyor",
      });
      updateOrchestration(jobId, { progress: 46, status: "cost" });

      // Try different payload formats for compatibility
      try {
        const costResult = (await postWithRetry(
          new URL(API.cost, base).toString(),
          { analysis }
        )) as { data?: unknown; cost?: unknown };
        cost = costResult?.data || costResult?.cost || costResult;
      } catch {
        const costResult = (await postWithRetry(
          new URL(API.cost, base).toString(),
          { extracted_data: analysis }
        )) as { data?: unknown; cost?: unknown };
        cost = costResult?.data || costResult?.cost || costResult;
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
      updateOrchestration(jobId, { progress: 72, status: "decision" });

      const decisionResult = (await postWithRetry(
        new URL(API.decision, base).toString(),
        { analysis, cost }
      )) as { data?: unknown; decision?: unknown };

      decision = decisionResult?.data || decisionResult?.decision || decisionResult;

      if (!decision) {
        throw new Error("Karar verisi alınamadı");
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
      } catch (e) {
        AILogger.warn("PDF rapor üretilemedi", {
          jobId,
          error: String(e),
        });
      }

      // XLSX Export (optional - don't fail if error)
      try {
        const xlsxResult = (await postWithRetry(
          new URL(API.xlsx, base).toString(),
          { analysis, cost, decision }
        )) as { path?: string };
        xlsxPath = xlsxResult?.path || null;
      } catch (e) {
        AILogger.warn("XLSX rapor üretilemedi", {
          jobId,
          error: String(e),
        });
      }

      /** STEP 5: DONE */
      const finalResult = { analysis, cost, decision, pdfPath, xlsxPath };

      emitJob(jobId, {
        step: "done",
        progress: 100,
        message: "Oto-pipeline tamamlandı",
        result: finalResult,
      });

      updateOrchestration(jobId, {
        progress: 100,
        status: "completed",
        result: finalResult,
      });

      AILogger.success("Orchestrator done", {
        jobId,
        fileName,
        pdfPath,
        xlsxPath,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";

      emitJob(jobId, {
        step: "error",
        progress: 100,
        message: errorMessage,
        error: errorMessage,
      });

      updateOrchestration(jobId, {
        status: "error",
        error: errorMessage,
      });

      AILogger.error("Orchestrator error", {
        jobId,
        fileName,
        error: err instanceof Error ? err.stack : String(err),
      });
    }
  })();

  return NextResponse.json({ success: true, jobId }, { status: 202 });
}
