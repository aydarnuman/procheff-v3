/**
 * Proactive Helper Functions
 * Utility functions for proactive features
 */

export function getIcon(type: string) {
  switch (type) {
    case 'alert': return 'AlertCircle';
    case 'tip': return 'Lightbulb';
    case 'opportunity': return 'TrendingUp';
    case 'reminder': return 'Clock';
    case 'insight': return 'BookOpen';
    default: return 'Info';
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'from-red-500 to-red-600';
    case 'high': return 'from-orange-500 to-orange-600';
    case 'medium': return 'from-indigo-500 to-purple-600';
    case 'low': return 'from-slate-500 to-slate-600';
    default: return 'from-slate-500 to-slate-600';
  }
}