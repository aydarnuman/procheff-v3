/**
 * Trust Score System
 * Calculates and manages user reliability scores
 */

import { UserPriceData } from './user-price-input';

export interface UserTrustMetrics {
  userId: string;
  totalSubmissions: number;
  verifiedSubmissions: number;
  rejectedSubmissions: number;
  averageAccuracy: number;
  receiptSubmissionRate: number;
  locationConsistency: number;
  submissionFrequency: number;
  lastActivityDate: Date;
  flaggedBehaviors: string[];
}

export interface TrustScoreFactors {
  verificationRate: number;      // Weight: 0.3
  accuracyScore: number;         // Weight: 0.25
  receiptRate: number;           // Weight: 0.15
  consistencyScore: number;      // Weight: 0.15
  activityScore: number;         // Weight: 0.1
  penaltyScore: number;          // Weight: 0.05
}

export class TrustScore {
  private static readonly INITIAL_TRUST_SCORE = 0.5;
  private static readonly MIN_TRUST_SCORE = 0.1;
  private static readonly MAX_TRUST_SCORE = 1.0;
  
  // Weights for different factors
  private static readonly WEIGHTS = {
    verificationRate: 0.3,
    accuracyScore: 0.25,
    receiptRate: 0.15,
    consistencyScore: 0.15,
    activityScore: 0.1,
    penaltyScore: 0.05
  };
  
  // Thresholds
  private static readonly THRESHOLDS = {
    minSubmissions: 5,
    suspiciousFrequency: 50, // More than 50 submissions per day
    inactivityDays: 90,
    lowAccuracy: 0.6,
    highRejectionRate: 0.3
  };
  
  static calculateTrustScore(metrics: UserTrustMetrics): number {
    // New users start with initial score
    if (metrics.totalSubmissions < this.THRESHOLDS.minSubmissions) {
      return this.INITIAL_TRUST_SCORE;
    }
    
    const factors = this.calculateFactors(metrics);
    
    // Calculate weighted score
    let score = 0;
    for (const [factor, weight] of Object.entries(this.WEIGHTS)) {
      score += factors[factor as keyof TrustScoreFactors] * weight;
    }
    
    // Apply bounds
    return Math.max(this.MIN_TRUST_SCORE, Math.min(this.MAX_TRUST_SCORE, score));
  }
  
  private static calculateFactors(metrics: UserTrustMetrics): TrustScoreFactors {
    return {
      verificationRate: this.calculateVerificationRate(metrics),
      accuracyScore: this.calculateAccuracyScore(metrics),
      receiptRate: this.calculateReceiptRate(metrics),
      consistencyScore: this.calculateConsistencyScore(metrics),
      activityScore: this.calculateActivityScore(metrics),
      penaltyScore: this.calculatePenaltyScore(metrics)
    };
  }
  
  private static calculateVerificationRate(metrics: UserTrustMetrics): number {
    if (metrics.totalSubmissions === 0) return 0;
    
    const verificationRate = metrics.verifiedSubmissions / 
      (metrics.totalSubmissions - metrics.rejectedSubmissions);
    
    return Math.min(1, verificationRate);
  }
  
  private static calculateAccuracyScore(metrics: UserTrustMetrics): number {
    // Average accuracy is provided by the system based on price deviation
    return Math.min(1, metrics.averageAccuracy);
  }
  
  private static calculateReceiptRate(metrics: UserTrustMetrics): number {
    // Bonus for providing receipts
    const rate = metrics.receiptSubmissionRate;
    
    // Non-linear scaling: more reward for consistent receipt submission
    if (rate > 0.8) return 1.0;
    if (rate > 0.6) return 0.9;
    if (rate > 0.4) return 0.7;
    if (rate > 0.2) return 0.5;
    return 0.3;
  }
  
  private static calculateConsistencyScore(metrics: UserTrustMetrics): number {
    // Location consistency - are they submitting from consistent locations?
    let score = metrics.locationConsistency;
    
    // Penalize suspicious submission patterns
    if (metrics.submissionFrequency > this.THRESHOLDS.suspiciousFrequency) {
      score *= 0.5; // Likely automated or spam
    }
    
    return score;
  }
  
  private static calculateActivityScore(metrics: UserTrustMetrics): number {
    const daysSinceLastActivity = 
      (Date.now() - metrics.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastActivity < 7) return 1.0;
    if (daysSinceLastActivity < 30) return 0.8;
    if (daysSinceLastActivity < 60) return 0.6;
    if (daysSinceLastActivity < this.THRESHOLDS.inactivityDays) return 0.4;
    return 0.2; // Very inactive
  }
  
  private static calculatePenaltyScore(metrics: UserTrustMetrics): number {
    let penalty = 1.0;
    
    // High rejection rate
    const rejectionRate = metrics.totalSubmissions > 0 
      ? metrics.rejectedSubmissions / metrics.totalSubmissions 
      : 0;
      
    if (rejectionRate > this.THRESHOLDS.highRejectionRate) {
      penalty *= (1 - rejectionRate);
    }
    
    // Flagged behaviors
    metrics.flaggedBehaviors.forEach(behavior => {
      switch (behavior) {
        case 'spam':
          penalty *= 0.3;
          break;
        case 'manipulation':
          penalty *= 0.2;
          break;
        case 'duplicate_submissions':
          penalty *= 0.7;
          break;
        case 'extreme_outliers':
          penalty *= 0.8;
          break;
      }
    });
    
    return Math.max(0, penalty);
  }
  
  static getTrustLevel(score: number): {
    level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    label: string;
    color: string;
  } {
    if (score >= 0.9) return { level: 'very_high', label: 'Çok Güvenilir', color: '#10b981' };
    if (score >= 0.7) return { level: 'high', label: 'Güvenilir', color: '#3b82f6' };
    if (score >= 0.5) return { level: 'medium', label: 'Orta', color: '#f59e0b' };
    if (score >= 0.3) return { level: 'low', label: 'Düşük', color: '#ef4444' };
    return { level: 'very_low', label: 'Çok Düşük', color: '#991b1b' };
  }
  
  static updateMetricsAfterSubmission(
    metrics: UserTrustMetrics,
    submission: UserPriceData,
    verificationOutcome: 'verified' | 'rejected' | 'pending'
  ): UserTrustMetrics {
    const updated = { ...metrics };
    
    updated.totalSubmissions++;
    updated.lastActivityDate = new Date();
    
    if (verificationOutcome === 'verified') {
      updated.verifiedSubmissions++;
    } else if (verificationOutcome === 'rejected') {
      updated.rejectedSubmissions++;
    }
    
    // Update receipt rate
    if (submission.receiptImageUrl) {
      const totalWithReceipt = metrics.receiptSubmissionRate * metrics.totalSubmissions + 1;
      updated.receiptSubmissionRate = totalWithReceipt / updated.totalSubmissions;
    } else {
      const totalWithReceipt = metrics.receiptSubmissionRate * metrics.totalSubmissions;
      updated.receiptSubmissionRate = totalWithReceipt / updated.totalSubmissions;
    }
    
    return updated;
  }
  
  static detectSuspiciousBehavior(
    userPrices: UserPriceData[]
  ): string[] {
    const flags: string[] = [];
    
    // Check for spam (too many submissions in short time)
    const recentSubmissions = userPrices.filter(p => {
      const hoursSince = (Date.now() - p.submittedAt.getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });
    
    if (recentSubmissions.length > this.THRESHOLDS.suspiciousFrequency) {
      flags.push('spam');
    }
    
    // Check for duplicate submissions
    const duplicates = this.findDuplicateSubmissions(userPrices);
    if (duplicates.length > userPrices.length * 0.1) {
      flags.push('duplicate_submissions');
    }
    
    // Check for extreme outliers
    const outliers = userPrices.filter(p => p.verificationStatus === 'rejected');
    if (outliers.length > userPrices.length * 0.5) {
      flags.push('extreme_outliers');
    }
    
    return flags;
  }
  
  private static findDuplicateSubmissions(prices: UserPriceData[]): UserPriceData[] {
    const seen = new Map<string, UserPriceData>();
    const duplicates: UserPriceData[] = [];
    
    prices.forEach(price => {
      const key = `${price.productName}-${price.price}-${price.marketName}`;
      const existing = seen.get(key);
      
      if (existing && Math.abs(existing.submittedAt.getTime() - price.submittedAt.getTime()) < 86400000) {
        duplicates.push(price);
      } else {
        seen.set(key, price);
      }
    });
    
    return duplicates;
  }
}
