/**
 * Multi-file upload endpoint for tender analysis
 */

import { AILogger } from '@/lib/ai/logger';
import { getDB } from '@/lib/db/sqlite-client';
import { buildDataPool } from '@/lib/document-processor/data-pool';
import type { DataPool, ExtractedTable, TextBlock } from '@/lib/document-processor/types';
import { NextRequest, NextResponse } from 'next/server';
import { createSSEResponse, SSEStream } from '@/lib/utils/sse-stream';
import { DataPoolManager } from '@/lib/state/data-pool-manager';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
  'text/plain',
  'text/html',
  'text/csv'
];

export async function POST(request: NextRequest) {
  const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Defensive: Check request size limit (100MB max for batch)
  const contentLength = request.headers.get('content-length');
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB for batch uploads
  
  if (contentLength && parseInt(contentLength) > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Request too large', message: 'Toplam dosya boyutu 100MB\'ı aşamaz' },
      { status: 413 }
    );
  }
  
  // Check if client wants SSE streaming
  const acceptHeader = request.headers.get('accept') || '';
  const wantsStreaming = acceptHeader.includes('text/event-stream') || 
                         request.headers.get('x-want-streaming') === 'true';

  // If streaming requested, return SSE response
  if (wantsStreaming) {
    return createStreamingResponse(sessionId, request);
  }

  // Otherwise, return normal JSON response
  try {
    AILogger.sessionStart(sessionId);
    
    const contentType = request.headers.get('content-type') || '';
    let dataPool: DataPool | null = null;
    let providedAnalysisId: string | null = null;
    const files: File[] = [];
    let totalSize = 0;
    let tenderId: string | null = null;

    // Check if this is a JSON request (from batch analysis)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      dataPool = body.dataPool as DataPool;
      providedAnalysisId = body.analysisId as string | null;

      if (!dataPool) {
        return NextResponse.json(
          {
            error: 'No data pool provided',
            message: 'DataPool is required for batch analysis'
          },
          { status: 400 }
        );
      }
    } else {
      // Original FormData handling
      const formData = await request.formData();
      tenderId = formData.get('tenderId') as string | null;

      // Extract all files from form data
      for (const [key, value] of formData) {
        if (key.startsWith('file') && value instanceof File) {
          // Validate file size
          if (value.size > MAX_FILE_SIZE) {
            return NextResponse.json(
              {
                error: 'File too large',
                message: `${value.name} exceeds maximum size of 50MB`
              },
              { status: 400 }
            );
          }

          // Validate file type
          const fileType = value.type || getMimeTypeFromName(value.name);
          if (!ALLOWED_TYPES.includes(fileType) && !value.name.endsWith('.docx')) {
            return NextResponse.json(
              {
                error: 'Invalid file type',
                message: `${value.name} is not a supported file type`
              },
              { status: 400 }
            );
          }

          totalSize += value.size;
          files.push(value);
        }
      }

      // Validate total size
      if (totalSize > MAX_TOTAL_SIZE) {
        return NextResponse.json(
          {
            error: 'Total size too large',
            message: 'Total file size exceeds 200MB limit'
          },
          { status: 400 }
        );
      }

      // Validate at least one file
      if (files.length === 0) {
        return NextResponse.json(
          {
            error: 'No files provided',
            message: 'Please upload at least one file'
          },
          { status: 400 }
        );
      }
    }

    // If dataPool is already provided (from batch analysis), use it
    // Otherwise, build from files
    let extractionDuration = 0;
    if (!dataPool) {
      AILogger.info('Processing tender documents', {
        fileCount: files.length,
        totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100 + 'MB',
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
        tenderId
      });

      // Build data pool from files
      const extractionStart = Date.now();
      let result;
      try {
        result = await buildDataPool(files, {
          ocr_enabled: true, // Enable OCR for PDFs with low text density
          extract_tables: true,
          extract_dates: true,
          extract_amounts: true,
          extract_entities: true,
          merge_blocks: true,
          clean_text: true,
          detect_language: false
        });
        extractionDuration = Date.now() - extractionStart;
      } catch (buildError) {
        AILogger.error('buildDataPool threw exception', {
          error: buildError instanceof Error ? buildError.message : String(buildError),
          stack: buildError instanceof Error ? buildError.stack : undefined
        });
        return NextResponse.json(
          {
            error: 'Build data pool failed',
            message: buildError instanceof Error ? buildError.message : 'Unknown error during data pool building',
            details: buildError
          },
          { status: 500 }
        );
      }

      if (!result.success || !result.dataPool) {
        AILogger.error('Data extraction failed', {
          errors: result.errors,
          errorCount: result.errors?.length || 0,
          hasDataPool: !!result.dataPool
        });

        // If we have some data but also errors, we can still proceed
        if (result.dataPool && result.dataPool.documents.length > 0) {
          AILogger.warn('Proceeding with partial data despite errors', {
            documents: result.dataPool.documents.length,
            errors: result.errors?.length || 0
          });
        } else {
          return NextResponse.json(
            {
              error: 'Extraction failed',
              message: 'Failed to extract data from documents',
              details: result.errors
            },
            { status: 500 }
          );
        }
      }

      dataPool = result.dataPool;
      extractionDuration = result.duration_ms || extractionDuration;
    } else {
      AILogger.info('Using provided DataPool from batch analysis', {
        documents: dataPool.documents.length,
        textBlocks: dataPool.textBlocks.length,
        tables: dataPool.tables.length
      });
      // For provided DataPool, use metadata extraction time if available
      extractionDuration = dataPool.metadata?.extraction_time_ms || 0;
    }

    // If tenderId is provided, add tender information to data pool
    if (tenderId) {
      try {
        // Get tender detail from our API (already parsed with AI)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
          (request.headers.get('host') ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 'http://localhost:3000');
        
        const detailRes = await fetch(`${baseUrl}/api/ihale/detail/${tenderId}`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        });

        if (!detailRes.ok) {
          throw new Error('İhale detayı alınamadı');
        }

        const tenderDetail = await detailRes.json();

        // Use already parsed data (ai_parsed) - this is structured data, not HTML
        const aiParsed = tenderDetail.ai_parsed;

        if (aiParsed) {
            // Create a document info for tender
            const tenderDocId = `tender-${tenderId}`;
            const tenderTitle = tenderDetail.title || tenderDetail.workName || tenderDetail.isin_adi || `İhale ${tenderId}`;
            const tenderDoc = {
              doc_id: tenderDocId,
              type_guess: 'ihale_detay' as const,
              hash: '',
              name: `İhale Detay - ${tenderTitle}`,
              size: JSON.stringify(aiParsed).length, // Use parsed data size
              mime_type: 'application/json',
              created_at: new Date().toISOString()
            };

            // Add tender document
            dataPool.documents.push(tenderDoc);

            // Add text blocks from sections
            if (aiParsed.sections && Array.isArray(aiParsed.sections) && aiParsed.sections.length > 0) {
              aiParsed.sections.forEach((section: { items?: Array<{ label?: string; value?: string }> }, sectionIndex: number) => {
                if (section.items && Array.isArray(section.items)) {
                  section.items.forEach((item: { label?: string; value?: string }, itemIndex: number) => {
                    const textBlock: TextBlock = {
                      block_id: `${tenderDocId}:section-${sectionIndex}:item-${itemIndex}`,
                      text: `${item.label || ''}: ${item.value || ''}`,
                      doc_id: tenderDocId,
                      source: tenderDocId,
                      page: sectionIndex + 1
                    };
                    dataPool.textBlocks.push(textBlock);
                  });
                }
              });
            }

            // Add text content
            if (aiParsed.textContent && Array.isArray(aiParsed.textContent) && aiParsed.textContent.length > 0) {
              aiParsed.textContent.forEach((paragraph: string, pIndex: number) => {
                const textBlock: TextBlock = {
                  block_id: `${tenderDocId}:text-${pIndex}`,
                  text: paragraph,
                  doc_id: tenderDocId,
                  source: tenderDocId,
                  page: 1
                };
                dataPool.textBlocks.push(textBlock);
              });
            }

            // Add tables
            if (aiParsed.tables && Array.isArray(aiParsed.tables) && aiParsed.tables.length > 0) {
              aiParsed.tables.forEach((table: { title?: string; headers?: string[]; rows?: string[][] }, tIndex: number) => {
                const extractedTable: ExtractedTable = {
                  table_id: `${tenderDocId}:table-${tIndex}`,
                  doc_id: tenderDocId,
                  page: 1,
                  title: table.title,
                  headers: table.headers || [],
                  rows: table.rows || []
                };
                dataPool.tables.push(extractedTable);
              });
            }

            // Add summary as text block
            if (aiParsed.summary) {
              const summaryBlock: TextBlock = {
                block_id: `${tenderDocId}:summary`,
                text: `ÖZET: ${aiParsed.summary}`,
                doc_id: tenderDocId,
                source: tenderDocId,
                page: 0
              };
              dataPool.textBlocks.push(summaryBlock);
            }

            // Update rawText
            const tenderText = [
              (aiParsed as { summary?: string }).summary || '',
              ...(Array.isArray(aiParsed.sections) ? aiParsed.sections.flatMap((s: { items?: Array<{ label?: string; value?: string }> }) => 
                (s.items || []).map((i: { label?: string; value?: string }) => `${i.label || ''}: ${i.value || ''}`)
              ) : []),
              ...(Array.isArray(aiParsed.textContent) ? aiParsed.textContent : [])
            ].filter(Boolean).join('\n\n');

            dataPool.rawText += `\n\n--- İHALE DETAY BİLGİLERİ ---\n${tenderText}`;

            // Update basic info
            interface TenderDetail {
              organization?: string;
              tenderType?: string;
              tender_type?: string;
              kurum?: string;
            }
            const tenderDetailTyped = tenderDetail as TenderDetail;
            if (tenderDetailTyped.organization || tenderDetailTyped.tenderType || tenderDetailTyped.kurum) {
              dataPool.basicInfo = {
                ...dataPool.basicInfo,
                kurum: tenderDetailTyped.organization || tenderDetailTyped.kurum || dataPool.basicInfo?.kurum,
                institution: tenderDetailTyped.organization || tenderDetailTyped.kurum || dataPool.basicInfo?.institution,
                ihale_turu: tenderDetailTyped.tenderType || tenderDetailTyped.tender_type || dataPool.basicInfo?.ihale_turu,
                tender_type: tenderDetailTyped.tenderType || tenderDetailTyped.tender_type || dataPool.basicInfo?.tender_type
              };
            }

            // Update metadata
            dataPool.metadata.total_words += tenderText.split(/\s+/).length;

            AILogger.info('Tender information added to data pool', {
              tenderId,
              sections: aiParsed.sections?.length || 0,
              tables: aiParsed.tables?.length || 0,
              textBlocks: aiParsed.textContent?.length || 0
            });
          }
      } catch (tenderError) {
        AILogger.warn('Failed to add tender information to data pool', {
          tenderId,
          error: tenderError instanceof Error ? tenderError.message : 'Unknown error'
        });
        // Continue without tender info - don't fail the whole analysis
      }
    }

    // Generate analysis ID (or use provided one)
    const analysisId = providedAnalysisId || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store initial analysis in database
    try {
      const db = getDB();

      // Determine representative filename
      const primaryFileName =
        files[0]?.name ||
        dataPool.documents?.[0]?.name ||
        'Auto-generated';

      // Create analysis record
      const stmt = db.prepare(`
        INSERT INTO analysis_history (
          id,
          file_name,
          status,
          input_files,
          data_pool,
          created_at,
          duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        analysisId,
        primaryFileName,
        'extracting',
        JSON.stringify(files.map(f => ({ name: f.name, size: f.size }))),
        JSON.stringify(dataPool),
        new Date().toISOString(),
        extractionDuration
      );

      AILogger.success('Data extraction completed', {
        analysisId,
        documents: dataPool.documents.length,
        textBlocks: dataPool.textBlocks.length,
        tables: dataPool.tables.length,
        dates: dataPool.dates.length,
        entities: dataPool.entities.length,
        warnings: dataPool.metadata.warnings,
        duration: extractionDuration
      });
    } catch (dbError) {
      AILogger.error('Database save failed', { error: dbError });
      // Continue even if DB save fails
    }

    // Trigger background analysis process
    try {
      // Call the process endpoint asynchronously
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analysis/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId,
          dataPool,
          options: {
            enable_contextual: true,
            enable_market: true,
            enable_deep: false,
            parallel_processing: true
          }
        })
      }).then(response => {
        if (!response.ok) {
          AILogger.error('Background analysis failed to start', {
            analysisId,
            status: response.status
          });
        }
      }).catch(error => {
        AILogger.error('Background analysis error', { analysisId, error });
      });

      AILogger.info('Background analysis triggered', { analysisId });
    } catch (error) {
      AILogger.error('Failed to trigger background analysis', { analysisId, error });
    }

    // Return data pool
    return NextResponse.json({
      success: true,
      analysisId,
      dataPool,
      metadata: {
        fileCount: files.length,
        totalSize,
        extractionTime: extractionDuration,
        warnings: dataPool.metadata.warnings,
        analysisStarted: true
      }
    });

    AILogger.sessionEnd(sessionId, 'completed');

  } catch (error) {
    AILogger.error('Upload endpoint error', { error });
    AILogger.sessionEnd(sessionId, 'failed');

    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Create SSE streaming response for upload endpoint
 */
function createStreamingResponse(sessionId: string, request: NextRequest): Response {
  return createSSEResponse(async (stream: SSEStream) => {
    const startTime = Date.now();
    
    try {
      AILogger.sessionStart(sessionId);
      stream.sendProgress('upload', 0, '🚀 Toplu analiz başladı');

        const contentType = request.headers.get('content-type') || '';
        let dataPool: DataPool | null = null;
        let providedAnalysisId: string | null = null;
        let files: File[] = [];
        let totalSize = 0;
        let tenderId: string | null = null;

        // Check if this is a JSON request (from batch analysis)
        if (contentType.includes('application/json')) {
          stream.sendProgress('datapool', 10, '📦 DataPool alınıyor...');
          
          const body = await request.json();
          dataPool = body.dataPool as DataPool;
          providedAnalysisId = body.analysisId as string | null;

          if (!dataPool) {
            stream.sendError('NO_DATAPOOL', 'DataPool bulunamadı');
            AILogger.sessionEnd(sessionId, 'failed');
            return;
          }

          stream.sendProgress('datapool', 20, '✅ DataPool alındı');
        } else {
          // Original FormData handling
          stream.sendProgress('upload', 5, '📤 Form data alınıyor...');
          
          const formData = await request.formData();
          tenderId = formData.get('tenderId') as string | null;

          stream.sendProgress('validation', 10, '🔍 Dosyalar doğrulanıyor...');

          // Extract all files from form data
          const extractedFiles: File[] = [];
          for (const [key, value] of formData) {
            if (key.startsWith('file') && value instanceof File) {
              // Validate file size
              if (value.size > MAX_FILE_SIZE) {
                stream.sendError('FILE_TOO_LARGE', `${value.name} çok büyük (Max: 50MB)`);
                AILogger.sessionEnd(sessionId, 'failed');
                return;
              }

              // Validate file type
              const fileType = value.type || getMimeTypeFromName(value.name);
              if (!ALLOWED_TYPES.includes(fileType) && !value.name.endsWith('.docx')) {
                stream.sendError('UNSUPPORTED_FORMAT', `${value.name} desteklenmeyen format`);
                AILogger.sessionEnd(sessionId, 'failed');
                return;
              }

              totalSize += value.size;
              extractedFiles.push(value);
            }
          }
          files = extractedFiles;

          // Validate total size
          if (totalSize > MAX_TOTAL_SIZE) {
            stream.sendError('FILE_TOO_LARGE', 'Toplam dosya boyutu 200MB\'ı aşamaz');
            AILogger.sessionEnd(sessionId, 'failed');
            return;
          }

          // Validate at least one file
          if (files.length === 0) {
            stream.sendError('NO_FILES', 'Hiç dosya bulunamadı');
            AILogger.sessionEnd(sessionId, 'failed');
            return;
          }

          stream.sendProgress('validation', 20, `✅ ${files.length} dosya doğrulandı`);
        }

        // If dataPool is already provided (from batch analysis), use it
        // Otherwise, build from files
        if (!dataPool) {
          stream.sendProgress('processing', 30, `⚙️ ${files.length} dosya işleniyor...`);
          
          AILogger.info('Processing tender documents', {
            fileCount: files.length,
            totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100 + 'MB',
            files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
            tenderId,
            sessionId
          });

          // Build data pool from files
          let buildResult;
          try {
            buildResult = await buildDataPool(files, {
              ocr_enabled: true, // Enable OCR for PDFs with low text density
              extract_tables: true,
              extract_dates: true,
              extract_amounts: true,
              extract_entities: true,
              merge_blocks: true,
              clean_text: true,
              detect_language: false
            }, (message, progress) => {
              // Forward progress from buildDataPool
              const adjustedProgress = 30 + (progress || 0) * 0.5; // 30-80% range
              stream.sendProgress('processing', adjustedProgress, message);
            });
          } catch (buildError) {
            AILogger.error('buildDataPool threw exception', {
              error: buildError instanceof Error ? buildError.message : String(buildError),
              stack: buildError instanceof Error ? buildError.stack : undefined,
              sessionId
            });
            stream.sendError('PROCESSING_ERROR', 'DataPool oluşturulamadı');
            AILogger.sessionEnd(sessionId, 'failed');
            return;
          }

          if (!buildResult.success || !buildResult.dataPool) {
            AILogger.error('Data extraction failed', {
              errors: buildResult.errors,
              errorCount: buildResult.errors?.length || 0,
              hasDataPool: !!buildResult.dataPool,
              sessionId
            });

            if (buildResult.dataPool && buildResult.dataPool.documents.length > 0) {
              AILogger.warn('Proceeding with partial data despite errors', {
                documents: buildResult.dataPool.documents.length,
                errors: buildResult.errors?.length || 0,
                sessionId
              });
            } else {
              stream.sendError('PROCESSING_ERROR', 'Veri çıkarılamadı');
              AILogger.sessionEnd(sessionId, 'failed');
              return;
            }
          }

          dataPool = buildResult.dataPool;
          stream.sendProgress('processing', 80, '✅ DataPool oluşturuldu');
        } else {
          AILogger.info('Using provided DataPool from batch analysis', {
            documents: dataPool.documents.length,
            textBlocks: dataPool.textBlocks.length,
            tables: dataPool.tables.length,
            sessionId
          });
          stream.sendProgress('datapool', 50, '✅ DataPool kullanılıyor');
        }

        // If tenderId is provided, add tender information to data pool
        if (tenderId) {
          stream.sendProgress('enrichment', 85, '🔗 İhale bilgileri ekleniyor...');
          
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
              (request.headers.get('host') ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 'http://localhost:3000');
            
            const detailRes = await fetch(`${baseUrl}/api/ihale/detail/${tenderId}`, {
              headers: {
                'Cookie': request.headers.get('Cookie') || ''
              }
            });

            if (!detailRes.ok) {
              throw new Error('İhale detayı alınamadı');
            }

            const tenderDetail = await detailRes.json();
            const aiParsed = tenderDetail.ai_parsed;

            if (aiParsed) {
              const tenderDocId = `tender-${tenderId}`;
              const tenderTitle = tenderDetail.title || tenderDetail.workName || tenderDetail.isin_adi || `İhale ${tenderId}`;
              const tenderDoc = {
                doc_id: tenderDocId,
                type_guess: 'ihale_detay' as const,
                hash: '',
                name: `İhale Detay - ${tenderTitle}`,
                size: JSON.stringify(aiParsed).length,
                mime_type: 'application/json',
                created_at: new Date().toISOString()
              };

              dataPool.documents.push(tenderDoc);

              // Add text blocks, tables, etc. (same as before)
              if (aiParsed.sections && Array.isArray(aiParsed.sections) && aiParsed.sections.length > 0) {
                aiParsed.sections.forEach((section: { items?: Array<{ label?: string; value?: string }> }, sectionIndex: number) => {
                  if (section.items && Array.isArray(section.items)) {
                    section.items.forEach((item: { label?: string; value?: string }, itemIndex: number) => {
                      const textBlock: TextBlock = {
                        block_id: `${tenderDocId}:section-${sectionIndex}:item-${itemIndex}`,
                        text: `${item.label || ''}: ${item.value || ''}`,
                        doc_id: tenderDocId,
                        source: tenderDocId,
                        page: sectionIndex + 1
                      };
                      dataPool.textBlocks.push(textBlock);
                    });
                  }
                });
              }

              // Add text content
              if (aiParsed.textContent && Array.isArray(aiParsed.textContent) && aiParsed.textContent.length > 0) {
                aiParsed.textContent.forEach((paragraph: string, pIndex: number) => {
                  const textBlock: TextBlock = {
                    block_id: `${tenderDocId}:text-${pIndex}`,
                    text: paragraph,
                    doc_id: tenderDocId,
                    source: tenderDocId,
                    page: 1
                  };
                  dataPool.textBlocks.push(textBlock);
                });
              }

              // Add tables
              if (aiParsed.tables && Array.isArray(aiParsed.tables) && aiParsed.tables.length > 0) {
                aiParsed.tables.forEach((table: { title?: string; headers?: string[]; rows?: string[][] }, tIndex: number) => {
                  const extractedTable: ExtractedTable = {
                    table_id: `${tenderDocId}:table-${tIndex}`,
                    doc_id: tenderDocId,
                    page: 1,
                    title: table.title,
                    headers: table.headers || [],
                    rows: table.rows || []
                  };
                  dataPool.tables.push(extractedTable);
                });
              }
              
              AILogger.info('Tender information added to data pool', {
                tenderId,
                sections: aiParsed.sections?.length || 0,
                tables: aiParsed.tables?.length || 0,
                textBlocks: aiParsed.textContent?.length || 0,
                sessionId
              });
            }
          } catch (tenderError) {
            AILogger.warn('Failed to add tender information to data pool', {
              tenderId,
              error: tenderError instanceof Error ? tenderError.message : 'Unknown error',
              sessionId
            });
            // Continue without tender info
          }
        }

        // Generate analysis ID
        const analysisId = providedAnalysisId || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        stream.sendProgress('saving', 90, '💾 Veritabanına kaydediliyor...');

        // Save DataPool using DataPoolManager (atomic operation - includes metadata)
        try {
          await DataPoolManager.save(analysisId, dataPool, {
            status: 'extracting',
            inputFiles: files.map(f => ({ name: f.name, size: f.size })),
            duration_ms: Date.now() - startTime
          });

          AILogger.success('Data extraction completed', {
            analysisId,
            documents: dataPool.documents.length,
            textBlocks: dataPool.textBlocks.length,
            tables: dataPool.tables.length,
            dates: dataPool.dates.length,
            entities: dataPool.entities.length,
            warnings: dataPool.metadata.warnings,
            duration: Date.now() - startTime,
            sessionId
          });
        } catch (dbError) {
          AILogger.error('Database save failed', { error: dbError, sessionId });
          // Continue even if DB save fails
        }

        stream.sendProgress('analysis', 95, '🚀 Analiz başlatılıyor...');

        // Trigger background analysis process
        try {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analysis/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              analysisId,
              dataPool,
              options: {
                enable_contextual: true,
                enable_market: true,
                enable_deep: false,
                parallel_processing: true
              }
            })
          }).then(response => {
            if (!response.ok) {
              AILogger.error('Background analysis failed to start', {
                analysisId,
                status: response.status,
                sessionId
              });
            }
          }).catch(error => {
            AILogger.error('Background analysis error', { analysisId, error, sessionId });
          });

          AILogger.info('Background analysis triggered', { analysisId, sessionId });
        } catch (error) {
          AILogger.error('Failed to trigger background analysis', { analysisId, error, sessionId });
        }

        stream.sendProgress('complete', 100, '✅ İşlem tamamlandı');

        stream.sendSuccess({
          success: true,
          analysisId,
          dataPool,
          metadata: {
            fileCount: files.length,
            totalSize,
            extractionTime: Date.now() - startTime,
            warnings: dataPool.metadata.warnings,
            analysisStarted: true
          }
        }, 'İşlem başarıyla tamamlandı');

        AILogger.sessionEnd(sessionId, 'completed');
      } catch (error) {
        AILogger.error('Upload endpoint error', { error, sessionId });
        AILogger.sessionEnd(sessionId, 'failed');
        
        stream.sendError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
        );
      }
    });
}

/**
 * Get MIME type from filename
 */
function getMimeTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'zip':
      return 'application/zip';
    case 'txt':
      return 'text/plain';
    case 'html':
      return 'text/html';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}