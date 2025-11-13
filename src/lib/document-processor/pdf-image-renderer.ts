/**
 * PDF → Image rasterizer for server-side OCR
 * Uses pdfjs-dist with @napi-rs/canvas to render pages into PNG buffers.
 */

import { AILogger } from '@/lib/ai/logger';

export interface RasterizeOptions {
  dpi?: number;
  maxPages?: number;
}

export interface RasterizeResult {
  images: Buffer[];
  pageCount: number;
  mimeType: 'image/png';
}

/**
 * Detect if a buffer is a PDF file by header.
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.subarray(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Render a PDF buffer to PNG images (one per page).
 * Falls back gracefully if rendering is unavailable.
 */
export async function renderPdfToImages(
  pdfBuffer: Buffer,
  opts: RasterizeOptions = {}
): Promise<RasterizeResult> {
  const dpi = typeof opts.dpi === 'number' && opts.dpi > 0 ? opts.dpi : 200;
  const maxPages = typeof opts.maxPages === 'number' && opts.maxPages > 0 ? opts.maxPages : 5;

  const start = Date.now();
  AILogger.info('PDF rasterization started', { dpi, maxPages, size: pdfBuffer.length });

  try {
    // Dynamic imports to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = await import('pdfjs-dist');
    // Prefer napi-rs canvas for Node
    const canvasMod = await import('@napi-rs/canvas');

    // In Node, workerSrc is not required; pdfjs-dist runs in same thread.
    // However, older versions may still require GlobalWorkerOptions; keep safe.
    if ((pdfjsLib as any).GlobalWorkerOptions) {
      // No external worker file in Node; leave as is.
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = undefined;
    }

    // Open document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;

    const totalPages: number = pdfDoc.numPages;
    const pagesToRender = Math.min(totalPages, maxPages);
    const images: Buffer[] = [];

    // Minimal CanvasFactory for pdfjs-dist (Node)
    class CanvasFactory {
      create(width: number, height: number): { canvas: any; context: any } {
        const canvas = canvasMod.createCanvas(width, height);
        const context = canvas.getContext('2d');
        return { canvas, context };
      }
      reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
      }
      destroy(canvasAndContext: { canvas: any; context: any }) {
        // @napi-rs/canvas cleans up with GC; no-op
        void canvasAndContext;
      }
    }

    const factory = new CanvasFactory();

    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
      // eslint-disable-next-line no-await-in-loop
      const page = await pdfDoc.getPage(pageNum);
      const scale = dpi / 72; // 72 DPI base
      const viewport = page.getViewport({ scale });

      const { canvas, context } = factory.create(viewport.width, viewport.height);

      // Render
      // eslint-disable-next-line no-await-in-loop
      // pdfjs types vary; use minimal shape known by the library
      const renderTask = page.render({
        canvasContext: context,
        viewport,
        canvasFactory: factory,
      } as any);
      // eslint-disable-next-line no-await-in-loop
      await renderTask.promise;

      // Export as PNG
      // @napi-rs/canvas supports PNG out of the box
      const pngBuffer: Buffer = canvas.toBuffer('image/png');
      images.push(pngBuffer);
    }

    const duration = Date.now() - start;
    AILogger.info('PDF rasterization completed', {
      pageCount: totalPages,
      rendered: images.length,
      durationMs: duration,
    });

    return {
      images,
      pageCount: totalPages,
      mimeType: 'image/png',
    };
  } catch (error) {
    AILogger.error('PDF rasterization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Graceful fallback: return empty images; caller decides next step
    return { images: [], pageCount: 0, mimeType: 'image/png' };
  }
}


