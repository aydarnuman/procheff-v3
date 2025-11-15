/**
 * Complete Analysis Endpoint
 * Marks analysis as queued and validates file storage
 * 
 * Features from old system:
 * - File existence check
 * - File stats/metadata
 * - 202 Accepted response pattern
 * - Progress tracking
 * - Error handling with codes
 * - Duration tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getAnalysis, updateAnalysis } from '@/lib/analysis/records';
import { AILogger } from '@/lib/ai/logger';
import { errorHandler } from '@/lib/middleware/error-handler';
import { createErrorResponse } from '@/lib/utils/error-codes';

export const dynamic = 'force-dynamic';
export const maxDuration = 15; // 15 seconds timeout

async function handleComplete(req: NextRequest) {
  const startTime = Date.now();
  const sessionId = `complete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  AILogger.sessionStart(sessionId);
  
  const body = await req.json().catch(() => null);
  
  if (!body || !body.analysisId) {
    AILogger.error('Complete failed: invalid payload', { sessionId });
    AILogger.sessionEnd(sessionId, 'failed');
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'analysisId is required'),
      { status: 400 }
    );
  }
    
    const { analysisId, storagePath } = body;
    
    AILogger.info('Complete analysis request', {
      analysisId,
      storagePath: storagePath ? 'provided' : 'not provided',
      sessionId
    });
    
    // Get analysis record
    const rec = await getAnalysis(analysisId);

    if (!rec) {
      AILogger.warn('Complete failed: analysis not found', { analysisId, sessionId });
      AILogger.sessionEnd(sessionId, 'failed');
      return NextResponse.json(
        createErrorResponse('INVALID_REQUEST', 'Analysis not found'),
        { status: 404 }
      );
    }

    // Verify file exists (if storagePath is provided)
    const finalStoragePath = storagePath ?? rec.storagePath;
    
    let fileSize: number | undefined;
    let fileExists = false;
    
    if (finalStoragePath) {
      // Check if file exists
      try {
        if (fs.existsSync(finalStoragePath)) {
          fileExists = true;
          // Get file stats
          const stats = fs.statSync(finalStoragePath);
          fileSize = stats.size;
          
          AILogger.info('File verified', {
            analysisId,
            storagePath: finalStoragePath,
            fileSize,
            sessionId
          });
        } else {
          AILogger.warn('File not found at storage path', {
            analysisId,
            storagePath: finalStoragePath,
            sessionId
          });
          AILogger.sessionEnd(sessionId, 'failed');
          return NextResponse.json(
            createErrorResponse('PROCESSING_ERROR', 'Uploaded file not found at storage path'),
            { status: 400 }
          );
        }
      } catch (fsError) {
        AILogger.error('File system error', {
          analysisId,
          storagePath: finalStoragePath,
          error: fsError instanceof Error ? fsError.message : String(fsError),
          sessionId
        });
        AILogger.sessionEnd(sessionId, 'failed');
        return NextResponse.json(
          createErrorResponse('PROCESSING_ERROR', 'Failed to access file system'),
          { status: 500 }
        );
      }
    } else {
      // No storage path - this is OK for in-memory processing
      AILogger.info('No storage path provided - using in-memory processing', {
        analysisId,
        sessionId
      });
    }

    // Update analysis record: mark as queued
    const updateSuccess = updateAnalysis(analysisId, {
      status: 'queued',
      progress: 1, // Start at 1%
      storagePath: finalStoragePath,
      updated_at: new Date().toISOString()
    });

    if (!updateSuccess) {
      AILogger.error('Failed to update analysis', { analysisId, sessionId });
      AILogger.sessionEnd(sessionId, 'failed');
      return NextResponse.json(
        createErrorResponse('PROCESSING_ERROR', 'Failed to update analysis record'),
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    
    AILogger.success('Analysis queued', {
      analysisId,
      filename: rec.filename || 'unknown',
      fileSize: fileSize ? `${(fileSize / 1024).toFixed(1)}KB` : 'N/A',
      storagePath: finalStoragePath || 'in-memory',
      duration,
      sessionId
    });
    
    AILogger.sessionEnd(sessionId, 'completed');

    // Return 202 Accepted (async processing pattern)
    return NextResponse.json(
      { 
        status: 'queued',
        analysisId,
        message: 'Analysis queued for processing',
        metadata: {
          filename: rec.filename,
          fileSize,
          storagePath: finalStoragePath,
          duration_ms: duration
        }
      }, 
      { status: 202 }
    );
}

export const POST = errorHandler(handleComplete as any);

