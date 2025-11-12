/**
 * Error Codes System
 * Detaylı hata kodları ve açıklamalar
 */

export type ErrorCode =
  | 'NO_FILES'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'PROCESSING_ERROR'
  | 'TEXT_TOO_SHORT'
  | 'API_RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'OCR_FAILED'
  | 'ZIP_EXTRACTION_FAILED'
  | 'AI_EXTRACTION_FAILED'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  description: string;
  solution?: string;
  httpStatus?: number;
}

export const ERROR_CODES: Record<ErrorCode, ErrorDetails> = {
  NO_FILES: {
    code: 'NO_FILES',
    message: 'Dosya bulunamadı',
    description: 'Yüklenecek dosya bulunamadı',
    solution: 'Lütfen en az bir dosya seçin',
    httpStatus: 400
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'Dosya çok büyük',
    description: 'Dosya boyutu limiti aşıldı',
    solution: 'Dosya boyutu 50MB\'dan küçük olmalıdır',
    httpStatus: 413
  },
  UNSUPPORTED_FORMAT: {
    code: 'UNSUPPORTED_FORMAT',
    message: 'Desteklenmeyen format',
    description: 'Dosya formatı desteklenmiyor',
    solution: 'Desteklenen formatlar: PDF, DOCX, TXT, CSV, XLSX, ZIP, JSON, HTML',
    httpStatus: 400
  },
  PROCESSING_ERROR: {
    code: 'PROCESSING_ERROR',
    message: 'İşleme hatası',
    description: 'Dosya işlenirken hata oluştu',
    solution: 'Dosyanın bozuk olmadığından emin olun',
    httpStatus: 500
  },
  TEXT_TOO_SHORT: {
    code: 'TEXT_TOO_SHORT',
    message: 'Metin çok kısa',
    description: 'Çıkarılan metin çok kısa (min 100 karakter)',
    solution: 'Daha fazla içerik içeren bir dosya yükleyin',
    httpStatus: 400
  },
  API_RATE_LIMIT: {
    code: 'API_RATE_LIMIT',
    message: 'API rate limit aşıldı',
    description: 'AI API rate limit aşıldı',
    solution: 'Lütfen birkaç saniye bekleyip tekrar deneyin',
    httpStatus: 429
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Bağlantı hatası',
    description: 'Ağ bağlantısı kurulamadı',
    solution: 'İnternet bağlantınızı kontrol edin',
    httpStatus: 503
  },
  OCR_FAILED: {
    code: 'OCR_FAILED',
    message: 'OCR işlemi başarısız',
    description: 'Görselden metin çıkarılamadı',
    solution: 'Daha kaliteli bir görsel yükleyin veya PDF metin katmanı kullanın',
    httpStatus: 500
  },
  ZIP_EXTRACTION_FAILED: {
    code: 'ZIP_EXTRACTION_FAILED',
    message: 'ZIP çıkarma hatası',
    description: 'ZIP dosyası açılamadı',
    solution: 'ZIP dosyasının bozuk olmadığından emin olun',
    httpStatus: 500
  },
  AI_EXTRACTION_FAILED: {
    code: 'AI_EXTRACTION_FAILED',
    message: 'AI veri çıkarma hatası',
    description: 'AI ile veri çıkarılamadı',
    solution: 'API anahtarlarınızı kontrol edin',
    httpStatus: 500
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Geçersiz istek',
    description: 'İstek formatı geçersiz',
    solution: 'Lütfen geçerli bir istek gönderin',
    httpStatus: 400
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Yetkisiz erişim',
    description: 'API anahtarı geçersiz veya eksik',
    solution: 'API anahtarlarınızı kontrol edin',
    httpStatus: 401
  },
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'Kota aşıldı',
    description: 'API kotası aşıldı',
    solution: 'API kotanızı kontrol edin',
    httpStatus: 429
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    message: 'Zaman aşımı',
    description: 'İşlem zaman aşımına uğradı',
    solution: 'Daha küçük dosyalar deneyin veya tekrar deneyin',
    httpStatus: 504
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'Bilinmeyen hata',
    description: 'Beklenmeyen bir hata oluştu',
    solution: 'Lütfen tekrar deneyin veya destek ekibiyle iletişime geçin',
    httpStatus: 500
  }
};

/**
 * Get error details by code
 */
export function getErrorDetails(code: ErrorCode): ErrorDetails {
  return ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Create error response
 */
export function createErrorResponse(code: ErrorCode, details?: string) {
  const errorDetails = getErrorDetails(code);
  return {
    success: false,
    error: {
      code: errorDetails.code,
      message: errorDetails.message,
      description: errorDetails.description,
      solution: errorDetails.solution,
      details
    },
    httpStatus: errorDetails.httpStatus || 500
  };
}

