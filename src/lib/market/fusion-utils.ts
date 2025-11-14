/**
 * Fusion Utility Functions
 * Helper functions for market fusion operations
 */

import type { FusionScore } from './fusion-engine';

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get score badge color
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  if (score >= 40) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 80) return 'Çok Yüksek';
  if (score >= 60) return 'Yüksek';
  if (score >= 40) return 'Orta';
  if (score >= 20) return 'Düşük';
  return 'Çok Düşük';
}

/**
 * Get confidence emoji
 */
export function getConfidenceEmoji(score: number): string {
  if (score >= 80) return '✅';
  if (score >= 60) return '👍';
  if (score >= 40) return '⚠️';
  if (score >= 20) return '❗';
  return '❌';
}

/**
 * Format fusion score for display
 */
export function formatFusionScore(score: FusionScore): {
  overall: string;
  reliability: string;
  consistency: string;
  completeness: string;
  freshness: string;
  stock: string;
} {
  return {
    overall: `${score.overall.toFixed(1)}%`,
    reliability: `${score.sourceReliability.toFixed(1)}%`,
    consistency: `${score.priceConsistency.toFixed(1)}%`,
    completeness: `${score.dataCompleteness.toFixed(1)}%`,
    freshness: `${score.dataFreshness.toFixed(1)}%`,
    stock: `${score.stockAvailability.toFixed(1)}%`,
  };
}

/**
 * Get score interpretation
 */
export function getScoreInterpretation(score: FusionScore): string {
  const { overall } = score;

  if (overall >= 80) {
    return 'Mükemmel veri kalitesi. Fiyat tahmini çok güvenilir.';
  } else if (overall >= 60) {
    return 'İyi veri kalitesi. Fiyat tahmini güvenilir.';
  } else if (overall >= 40) {
    return 'Orta seviye veri kalitesi. Fiyat tahmini dikkatle kullanılmalı.';
  } else if (overall >= 20) {
    return 'Düşük veri kalitesi. Ek kaynaklarla doğrulama önerilir.';
  } else {
    return 'Çok düşük veri kalitesi. Sonuçlar güvenilir olmayabilir.';
  }
}

/**
 * Get recommendations based on score
 */
export function getFusionRecommendations(score: FusionScore): string[] {
  const recommendations: string[] = [];

  if (score.sourceReliability < 60) {
    recommendations.push('🔍 Daha fazla veri kaynağı eklenmeli');
  }

  if (score.priceConsistency < 50) {
    recommendations.push('⚠️ Fiyat tutarsızlıkları mevcut, birden fazla kaynak kontrol edin');
  }

  if (score.dataCompleteness < 70) {
    recommendations.push('📊 Veri eksiklikleri var, detaylı bilgi için market sitelerini kontrol edin');
  }

  if (score.dataFreshness < 60) {
    recommendations.push('🕒 Veri güncelliği düşük, yeni fiyat taraması yapılmalı');
  }

  if (score.stockAvailability < 50) {
    recommendations.push('📦 Stok durumu belirsiz, mağazalarla iletişime geçin');
  }

  if (score.breakdown.outliersRemoved > 0) {
    recommendations.push(`🎯 ${score.breakdown.outliersRemoved} adet sapan fiyat tespit edildi ve filtrelendi`);
  }

  if (score.breakdown.avgAge > 7) {
    recommendations.push('📅 Fiyatlar 7 günden eski, güncel tarama önerilir');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Tüm metrikler iyi durumda');
  }

  return recommendations;
}

/**
 * Compare two fusion scores
 */
export function compareFusionScores(
  score1: FusionScore,
  score2: FusionScore
): {
  better: 'first' | 'second' | 'equal';
  difference: number;
  improvements: string[];
  degradations: string[];
} {
  const diff = score1.overall - score2.overall;
  const improvements: string[] = [];
  const degradations: string[] = [];

  // Compare individual metrics
  const metrics: Array<keyof FusionScore> = [
    'sourceReliability',
    'priceConsistency',
    'dataCompleteness',
    'dataFreshness',
    'stockAvailability',
  ];

  for (const metric of metrics) {
    const diff = (score1[metric] as number) - (score2[metric] as number);
    if (diff > 5) {
      improvements.push(`${metric}: +${diff.toFixed(1)}%`);
    } else if (diff < -5) {
      degradations.push(`${metric}: ${diff.toFixed(1)}%`);
    }
  }

  return {
    better: diff > 0 ? 'first' : diff < 0 ? 'second' : 'equal',
    difference: Math.abs(diff),
    improvements,
    degradations,
  };
}

/**
 * Calculate fusion trend
 */
export function calculateFusionTrend(scores: FusionScore[]): {
  trend: 'improving' | 'stable' | 'declining';
  avgScore: number;
  change: number;
} {
  if (scores.length < 2) {
    return {
      trend: 'stable',
      avgScore: scores[0]?.overall || 0,
      change: 0,
    };
  }

  const avgScore = scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const firstAvg = firstHalf.reduce((sum, s) => sum + s.overall, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, s) => sum + s.overall, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;

  return {
    trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
    avgScore,
    change,
  };
}
