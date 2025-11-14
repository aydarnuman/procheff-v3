/**
 * Tender Type Definitions
 * Types for İhale (public procurement) data and operations
 */

/**
 * Tender status
 */
export type TenderStatus =
  | 'draft'
  | 'published'
  | 'active'
  | 'closed'
  | 'awarded'
  | 'cancelled';

/**
 * Tender type
 */
export type TenderType =
  | 'acik_ihale'
  | 'belli_istekli'
  | 'pazarlik_usulu'
  | 'dogrudan_temin';

/**
 * Document type
 */
export type DocumentType =
  | 'ihale_dokumani'
  | 'teknik_sartname'
  | 'idari_sartname'
  | 'ek_dokuman';

/**
 * Tender document
 */
export interface TenderDocument {
  id: string;
  tenderId: string;
  type: DocumentType;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tender institution
 */
export interface TenderInstitution {
  id: string;
  name: string;
  type: 'kamu' | 'ozel' | 'belediye' | 'universite';
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Tender contact
 */
export interface TenderContact {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  department?: string;
}

/**
 * Tender timeline
 */
export interface TenderTimeline {
  announcementDate?: string;
  documentSaleStartDate?: string;
  documentSaleEndDate?: string;
  questionDeadline?: string;
  submissionDeadline: string;
  openingDate: string;
  awardDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

/**
 * Tender financial info
 */
export interface TenderFinancialInfo {
  estimatedBudget?: number;
  currency: 'TRY' | 'USD' | 'EUR';
  guaranteeRequired: boolean;
  guaranteeAmount?: number;
  guaranteeType?: 'teminat_mektubu' | 'nakit' | 'kefalet';
  paymentTerms?: string;
}

/**
 * Tender requirements
 */
export interface TenderRequirements {
  minimumCapacity?: number;
  requiredCertificates?: string[];
  requiredExperience?: string;
  technicalRequirements?: string[];
  personnelRequirements?: Array<{
    role: string;
    quantity: number;
    qualifications?: string[];
  }>;
  equipmentRequirements?: Array<{
    item: string;
    quantity: number;
    specifications?: string;
  }>;
}

/**
 * Tender service details
 */
export interface TenderServiceDetails {
  serviceType: 'yemek' | 'catering' | 'kantin' | 'kafeterya';
  dailyMeals: number;
  totalDays: number;
  totalMeals: number;
  mealTypes: Array<{
    type: 'kahvalti' | 'ogle' | 'aksam' | 'ara_ogun';
    quantity: number;
    requirements?: string;
  }>;
  specialRequirements?: string[];
  menuConstraints?: string[];
}

/**
 * Main tender interface
 */
export interface Tender {
  id: string;
  externalId?: string;
  source: 'ihalebul' | 'ekap' | 'manual';

  // Basic info
  title: string;
  description?: string;
  type: TenderType;
  status: TenderStatus;

  // Institution
  institution: TenderInstitution;
  contact?: TenderContact;

  // Timeline
  timeline: TenderTimeline;

  // Financial
  financial: TenderFinancialInfo;

  // Requirements
  requirements?: TenderRequirements;

  // Service details (for catering tenders)
  serviceDetails?: TenderServiceDetails;

  // Documents
  documents: TenderDocument[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
}

/**
 * Tender list item (simplified for lists)
 */
export interface TenderListItem {
  id: string;
  title: string;
  institution: string;
  type: TenderType;
  status: TenderStatus;
  submissionDeadline: string;
  estimatedBudget?: number;
  dailyMeals?: number;
  totalDays?: number;
  isFavorite?: boolean;
  createdAt: string;
}

/**
 * Tender search filters
 */
export interface TenderFilters {
  status?: TenderStatus[];
  type?: TenderType[];
  institution?: string;
  city?: string;
  minBudget?: number;
  maxBudget?: number;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  isFavorite?: boolean;
}

/**
 * İhalebul.com specific types
 */
export interface IhalebulTender {
  id: string;
  baslik: string;
  kurum: string;
  ihale_turu: string;
  ihale_tarihi: string;
  ilanTarihi?: string;
  kategori?: string;
  sehir?: string;
  aciklama?: string;
  url?: string;
}

/**
 * İhalebul session
 */
export interface IhalebulSession {
  sessionId: string;
  username: string;
  expiresAt: string;
  isValid: boolean;
}

/**
 * İhalebul list response
 */
export interface IhalebulListResponse {
  success: boolean;
  data?: IhalebulTender[];
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
  error?: string;
}

/**
 * İhalebul detail response
 */
export interface IhalebulDetailResponse {
  success: boolean;
  data?: {
    tender: IhalebulTender;
    documents?: Array<{
      name: string;
      url: string;
      type: string;
    }>;
    details?: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Tender export format
 */
export type TenderExportFormat = 'csv' | 'json' | 'txt' | 'xlsx';

/**
 * Tender export request
 */
export interface TenderExportRequest {
  tenders: Tender[] | TenderListItem[];
  format: TenderExportFormat;
  options?: {
    includeDocuments?: boolean;
    includeAnalysis?: boolean;
  };
}
