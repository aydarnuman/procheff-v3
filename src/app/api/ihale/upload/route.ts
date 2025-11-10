import { AILogger } from "@/lib/ai/logger";
import { IHALE_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON } from "@/lib/ai/utils";
import { auth } from "@/lib/auth";
import { jobManager } from "@/lib/jobs/job-manager";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import mammoth from "mammoth";
import { NextRequest, NextResponse } from "next/server";

// Dynamic import for pdf-parse (CommonJS module)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const config = { api: { bodyParser: false } };
export const runtime = "nodejs";

/** SHA-256 hash */
async function sha256(buf: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Text extraction based on MIME type */
async function extractText(buf: Buffer, mime: string): Promise<string> {
  if (mime === "application/pdf") {
    try {
      const data = await pdfParse(buf);
      return data.text;
    } catch {
      return "";
    }
  }
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value;
  }
  if (mime.startsWith("text/")) return buf.toString("utf8");
  return "";
}

/** Detect MIME type using magic bytes */
async function detectMime(buf: Buffer): Promise<string> {
  const ft = await fileTypeFromBuffer(buf);
  return ft?.mime ?? "application/octet-stream";
}

/** Calculate text density */
function textDensity(str: string): number {
  const sample = str.slice(0, 8000);
  const alpha = (sample.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || []).length;
  return alpha / Math.max(1, sample.length);
}

/** Gemini 2.0 Vision OCR */
async function runOCRGemini(buf: Buffer): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured");
  }

  const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const img = {
    inlineData: {
      data: buf.toString("base64"),
      mimeType: "application/pdf",
    },
  };

  const result = await model.generateContent([
    {
      inlineData: img.inlineData,
    },
    {
      text: "Bu görsel/dokümandaki metni UTF-8 düz metin olarak çıkar. Ek yorum ekleme.",
    },
  ]);

  return result.response.text();
}

/** Main POST handler */
export async function POST(req: NextRequest) {
  // Authentication check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();

  try {
    // Create job
    jobManager.createJob(jobId);
    jobManager.updateJob(jobId, { status: 'processing', progress: 10 });

    // Parse multipart form data using Next.js built-in formData
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      jobManager.updateJob(jobId, {
        status: 'error',
        error: 'Dosya bulunamadı',
        progress: 0
      });
      return NextResponse.json({ success: false, error: "Dosya bulunamadı" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = await detectMime(buf);
    const hash = await sha256(buf);
    const sizeMB = (buf.byteLength / 1024 / 1024).toFixed(2);

    jobManager.updateJob(jobId, {
      progress: 20,
      metadata: {
        filename: file.name,
        filesize: buf.byteLength,
        mime_type: mime,
      },
    });

    AILogger.info("📄 Yeni ihale dokümanı alındı", {
      jobId,
      name: file.name,
      mime,
      sizeMB,
    });

    // Extract text
    jobManager.updateJob(jobId, { status: 'extract', progress: 30 });
    let text = await extractText(buf, mime);
    const density = textDensity(text);

    // Check if OCR needed
    let ocrUsed = false;
    if (mime === "application/pdf" && density < 0.25) {
      AILogger.warn("⚠️ Metin yoğunluğu düşük, Gemini Vision OCR devreye alındı", {
        jobId,
        density,
      });
      
      jobManager.updateJob(jobId, { status: 'ocr', progress: 50 });
      text = await runOCRGemini(buf);
      ocrUsed = true;
    }

    if (!text || text.trim().length < 100) {
      jobManager.updateJob(jobId, {
        status: 'error',
        error: 'Doküman metni okunamadı veya çok kısa',
        progress: 0
      });
      return NextResponse.json({
        success: false,
        error: "Doküman metni okunamadı veya çok kısa.",
      }, { status: 400 });
    }

    // Claude analysis
    jobManager.updateJob(jobId, { status: 'analyze', progress: 70 });
    const client = AIProviderFactory.getClaude();
    const prompt = `${IHALE_ANALYSIS_PROMPT}\n\nDOKÜMAN METNİ:\n${text.slice(0, 20000)}`;

    const start = Date.now();
    const result = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      temperature: 0.3,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
    const cleaned = cleanClaudeJSON(raw);
    const data = JSON.parse(cleaned);
    const duration = Date.now() - start;

    AILogger.success("✅ İhale analizi tamamlandı", {
      jobId,
      kurum: data.kurum,
      duration_ms: duration,
      ocr_used: ocrUsed,
      hash,
    });

    // Update job as completed
    jobManager.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result: data,
      metadata: {
        ...jobManager.getJob(jobId)?.metadata,
        ocr_used: ocrUsed,
      },
    });

    return NextResponse.json({
      success: true,
      jobId,
      data,
      meta: {
        duration_ms: duration,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        ocr_used: ocrUsed,
        sha256: hash,
        mime_type: mime,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    AILogger.error("❌ İhale analizi başarısız", { jobId, error });
    
    jobManager.updateJob(jobId, {
      status: 'error',
      error,
      progress: 0
    });

    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
