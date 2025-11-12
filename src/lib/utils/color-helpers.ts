/**
 * Color Helper Functions
 * Returns appropriate CSS classes based on confidence, risk, and status values
 */

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-400';
  if (confidence >= 0.6) return 'text-yellow-400';
  if (confidence >= 0.4) return 'text-orange-400';
  return 'text-red-400';
}

export function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500/10 border-green-500/20';
  if (confidence >= 0.6) return 'bg-yellow-500/10 border-yellow-500/20';
  if (confidence >= 0.4) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

export function getRiskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'dusuk':
    case 'low':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'orta':
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'yuksek':
    case 'high':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'yeterli':
    case 'sufficient':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'sinirda':
    case 'borderline':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'yetersiz':
    case 'insufficient':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

