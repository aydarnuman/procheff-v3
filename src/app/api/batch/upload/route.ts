import {
  createBatchFile,
  createBatchJob,
} from "@/features/batch-processing/init-batch-schema";
import { BATCH_CONFIG, FEATURE_FLAGS } from "@/features/config";
import {
  addRateLimitHeaders,
  checkRateLimit,
} from "@/features/rate-limiting/middleware";
import { AILogger } from "@/lib/ai/logger";
import crypto from "crypto";
import formidable from "formidable";
import fs from "fs/promises";
import { IncomingMessage } from "http";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle file uploads
  },
};

export async function POST(req: NextRequest) {
  // Feature flag check
  if (!FEATURE_FLAGS.BATCH_PROCESSING_ENABLED) {
    return NextResponse.json(
      {
        success: false,
        error: "Batch processing is not enabled",
      },
      { status: 503 }
    );
  }

  // Rate limiting
  const limitResult = await checkRateLimit(req, "/api/batch/upload");
  if (!limitResult.success) {
    return limitResult.response!;
  }

  try {
    // Parse multipart form data
    const formData = await parseFormData(req);

    if (!formData.files || formData.files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No files uploaded",
        },
        { status: 400 }
      );
    }

    // Validate file count
    if (formData.files.length > BATCH_CONFIG.MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${BATCH_CONFIG.MAX_FILES_PER_BATCH} files allowed per batch`,
        },
        { status: 400 }
      );
    }

    // Get priority from form data
    const priority = (formData.fields.priority?.[0] as
      | "high"
      | "normal"
      | "low") || "normal";

    // TODO: Get user_id from auth session
    const user_id = formData.fields.user_id?.[0];

    // Create batch job
    const batchId = crypto.randomUUID();
    const batch = createBatchJob({
      id: batchId,
      user_id,
      total_files: formData.files.length,
      priority,
    });

    AILogger.info("[Batch] Creating batch job", {
      batchId,
      fileCount: formData.files.length,
      priority,
    });

    // Process each file and create batch file entries
    const filePromises = formData.files.map(async (file) => {
      const fileBuffer = await fs.readFile(file.filepath);
      const fileHash = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      const fileId = crypto.randomUUID();

      // Create batch file entry
      const batchFile = createBatchFile({
        id: fileId,
        batch_id: batchId,
        filename: file.originalFilename || "unknown",
        file_size: file.size,
        file_hash: fileHash,
      });

      // TODO: Store file or just keep hash reference
      // For now, we'll delete the temp file
      await fs.unlink(file.filepath).catch(() => {});

      return {
        id: fileId,
        filename: batchFile.filename,
        size: batchFile.file_size,
        hash: batchFile.file_hash,
      };
    });

    const files = await Promise.all(filePromises);

    AILogger.success("[Batch] Batch job created", {
      batchId,
      filesCreated: files.length,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        status: batch.status,
        totalFiles: batch.total_files,
        priority: batch.priority,
        files,
      },
      message: `Batch job created with ${files.length} files. Processing will start shortly.`,
    });

    return addRateLimitHeaders(response, limitResult);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    AILogger.error("[Batch] Upload failed", {
      error: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Parse multipart form data
 */
async function parseFormData(req: NextRequest): Promise<{
  fields: formidable.Fields;
  files: formidable.File[];
}> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      maxFiles: BATCH_CONFIG.MAX_FILES_PER_BATCH,
      maxFileSize: 50 * 1024 * 1024, // 50MB per file
      filter: (part) => {
        // Only allow specific file types
        const allowedTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ];

        return (
          part.mimetype !== null && allowedTypes.includes(part.mimetype)
        );
      },
    });

    // Use the Request body directly for formidable
    // Note: We need to suppress type checking here as formidable expects IncomingMessage
    // but Next.js provides a different Request interface that is compatible
    form.parse(req as unknown as IncomingMessage, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Normalize files to array
      const fileArray: formidable.File[] = [];
      Object.values(files).forEach((file) => {
        if (Array.isArray(file)) {
          fileArray.push(...file);
        } else if (file) {
          fileArray.push(file);
        }
      });

      resolve({
        fields,
        files: fileArray,
      });
    });
  });
}
