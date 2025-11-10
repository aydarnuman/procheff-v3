/**
 * Job Helper Functions - Orchestrator için utility layer
 * job-manager singleton'ı wrap eder ve SSE event sistemi sağlar
 */

import { JobData, jobManager } from "./job-manager";

/**
 * Retry & Timeout Wrapper for API Calls
 * 60s timeout + 2 retry attempts for resilience
 */
export async function postWithRetry(
  url: string,
  body: unknown,
  tries = 2
): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000); // 60s timeout

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e; // Son deneme başarısız
      // Retry öncesi kısa bekleme
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("postWithRetry: Unreachable");
}

/**
 * Retry & Timeout Wrapper for FormData Uploads
 */
export async function postFormDataWithRetry(
  url: string,
  formData: FormData,
  tries = 2
): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000); // 120s for file uploads

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("postFormDataWithRetry: Unreachable");
}

/**
 * Yeni job oluştur
 */
export function createJob(id: string, metadata?: JobData["metadata"]): JobData {
  return jobManager.createJob(id, metadata);
}

/**
 * Job durumunu al
 */
export function getJobState(id: string): JobData | null {
  return jobManager.getJob(id);
}

/**
 * Job'a abone ol (SSE callback)
 */
export function subscribeJob(
  id: string,
  callback: (data: JobData) => void
): () => void {
  return jobManager.subscribe(id, callback);
}

/**
 * Job'a event yayınla (orchestrator steps için)
 */
export function emitJob(
  id: string,
  update: {
    step?: string;
    progress?: number;
    message?: string;
    result?: unknown;
    error?: string;
    [key: string]: unknown;
  }
): void {
  const job = jobManager.getJob(id);
  if (!job) return;

  // step → status mapping
  let status: JobData["status"] = job.status;
  if (update.step === "upload" || update.step === "init") {
    status = "pending";
  } else if (update.step === "ocr" || update.step === "extract") {
    status = "extract";
  } else if (update.step === "deep" || update.step === "cost" || update.step === "decision") {
    status = "analyze";
  } else if (update.step === "done") {
    status = "completed";
  } else if (update.step === "error") {
    status = "error";
  }

  jobManager.updateJob(id, {
    status,
    progress: update.progress ?? job.progress,
    result: update.result ?? job.result,
    error: update.error ?? job.error,
    metadata: {
      ...job.metadata,
      ...update,
    },
  });
}
