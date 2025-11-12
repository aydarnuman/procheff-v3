/**
 * Tender Content Validators
 * Validates AI-parsed tender data before saving
 */

import { AILogger } from '@/lib/ai/logger';

export interface ValidationOptions {
  minTextLength?: number;
  minDetailsCount?: number;
  requireDocuments?: boolean;
  strict?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTenderContent(
  data: {
    title?: string;
    organization?: string;
    details?: Record<string, string>;
    documents?: Array<any>;
    fullText?: string;
    announcementText?: string;
  },
  options: ValidationOptions = {}
): ValidationResult {
  const {
    minTextLength = 100,
    minDetailsCount = 3,
    requireDocuments = false,
    strict = false
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (!data.title || data.title.trim().length < 5) {
    if (strict) {
      errors.push('Title is missing or too short');
    } else {
      warnings.push('Title is missing or too short');
    }
  }

  // Organization validation
  if (!data.organization || data.organization.trim().length < 3) {
    if (strict) {
      errors.push('Organization is missing or too short');
    } else {
      warnings.push('Organization is missing or too short');
    }
  }

  // Text content validation
  const textContent = data.fullText || data.announcementText || '';
  if (textContent.length < minTextLength) {
    if (strict) {
      errors.push(`Text content is too short (${textContent.length} < ${minTextLength})`);
    } else {
      warnings.push(`Text content is short (${textContent.length} < ${minTextLength})`);
    }
  }

  // Details validation
  const detailsCount = data.details ? Object.keys(data.details).length : 0;
  if (detailsCount < minDetailsCount) {
    if (strict) {
      errors.push(`Not enough details (${detailsCount} < ${minDetailsCount})`);
    } else {
      warnings.push(`Few details found (${detailsCount} < ${minDetailsCount})`);
    }
  }

  // Documents validation
  if (requireDocuments && (!data.documents || data.documents.length === 0)) {
    errors.push('No documents found (required)');
  } else if (!data.documents || data.documents.length === 0) {
    warnings.push('No documents found');
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings
  };
}

export function logValidationResult(
  source: string,
  validation: ValidationResult,
  data: any
): void {
  if (validation.valid) {
    AILogger.info(`Validation passed: ${source}`, {
      warnings: validation.warnings.length,
      detailsCount: data.details ? Object.keys(data.details).length : 0,
      documentsCount: data.documents?.length || 0,
      textLength: (data.fullText || data.announcementText || '').length
    });
  } else {
    AILogger.warn(`Validation failed: ${source}`, {
      errors: validation.errors,
      warnings: validation.warnings,
      detailsCount: data.details ? Object.keys(data.details).length : 0,
      documentsCount: data.documents?.length || 0
    });
  }
}

