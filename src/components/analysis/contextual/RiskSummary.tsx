'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';

type RiskLevel = 'low' | 'medium' | 'high';

interface Risk {
  title: string;
  description: string;
  level: RiskLevel;
}

interface Recommendation {
  title: string;
  priority: 'high' | 'medium' | 'low';
}

interface RiskSummaryProps {
  risks: Risk[];
  recommendations: Recommendation[];
  overallRisk: RiskLevel;
}

export function RiskSummary({ risks, recommendations, overallRisk }: RiskSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {/* Risk Assessment */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            overallRisk === 'low' ? 'bg-green-500/20' :
            overallRisk === 'medium' ? 'bg-yellow-500/20' :
            'bg-red-500/20'
          }`}>
            {overallRisk === 'low' ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : overallRisk === 'medium' ? (
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Risk Değerlendirmesi</h3>
            <Badge
              variant={overallRisk === 'low' ? 'success' : overallRisk === 'medium' ? 'warning' : 'error'}
              size="sm"
            >
              {overallRisk === 'low' ? 'Düşük Risk' :
               overallRisk === 'medium' ? 'Orta Risk' :
               'Yüksek Risk'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {risks.map((risk, i) => (
            <motion.div
              key={i}
              className="p-3 rounded-lg bg-slate-800/50 border-l-4"
              style={{
                borderLeftColor:
                  risk.level === 'low' ? '#10b981' :
                  risk.level === 'medium' ? '#f59e0b' :
                  '#ef4444'
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-medium text-sm">{risk.title}</span>
                <TrafficLight level={risk.level} />
              </div>
              <p className="text-slate-400 text-xs">{risk.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Öneriler</h3>
            <p className="text-slate-400 text-sm">{recommendations.length} eylem</p>
          </div>
        </div>

        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm">{rec.title}</p>
                <Badge
                  variant={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}
                  size="sm"
                  className="mt-1"
                >
                  {rec.priority === 'high' ? 'Yüksek Öncelik' :
                   rec.priority === 'medium' ? 'Orta Öncelik' :
                   'Düşük Öncelik'}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function TrafficLight({ level }: { level: RiskLevel }) {
  return (
    <div className="flex gap-1">
      <div className={`w-2 h-2 rounded-full ${level === 'low' ? 'bg-green-500' : 'bg-slate-700'}`} />
      <div className={`w-2 h-2 rounded-full ${level === 'medium' ? 'bg-yellow-500' : 'bg-slate-700'}`} />
      <div className={`w-2 h-2 rounded-full ${level === 'high' ? 'bg-red-500' : 'bg-slate-700'}`} />
    </div>
  );
}
