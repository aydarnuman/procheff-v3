'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Decision = 'EVET' | 'DİKKATLİ' | 'GİRMEYİN';

interface DecisionBadgeProps {
  decision: Decision;
  reasoning?: string[];
  profitMargin?: number;
  riskLevel?: string;
  cashNeed?: string;
  className?: string;
}

export function DecisionBadge({
  decision,
  reasoning = [],
  profitMargin,
  riskLevel,
  cashNeed,
  className = ''
}: DecisionBadgeProps) {
  const config = {
    EVET: {
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/30'
    },
    DİKKATLİ: {
      icon: AlertTriangle,
      color: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30'
    },
    GİRMEYİN: {
      icon: XCircle,
      color: 'from-red-500 to-pink-500',
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30'
    }
  };

  const { icon: Icon, bg, text, border } = config[decision];

  return (
    <motion.div
      className={`glass-card p-6 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Decision Badge */}
      <motion.div
        className={`flex items-center gap-4 mb-5 p-4 rounded-xl border-2 ${border} ${bg}`}
        animate={{
          boxShadow: ['0 0 20px rgba(0,0,0,0)', '0 0 30px rgba(99,102,241,0.3)', '0 0 20px rgba(0,0,0,0)']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Icon className={`w-12 h-12 ${text}`} />
        </motion.div>

        <div className="flex-1">
          <p className="text-slate-400 text-sm mb-1">Karar</p>
          <motion.h2
            className={`text-3xl font-bold ${text}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {decision === 'EVET' ? '✅ Girebilirsiniz' :
             decision === 'DİKKATLİ' ? '⚠️ Dikkatli Girin' :
             '❌ Girmeyin'}
          </motion.h2>
        </div>
      </motion.div>

      {/* Reasoning */}
      {reasoning.length > 0 && (
        <div className="space-y-2 mb-5">
          <h3 className="text-white font-semibold text-sm mb-3">Gerekçe:</h3>
          {reasoning.map((reason, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2 text-sm text-slate-300"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${bg} mt-2 flex-shrink-0`} />
              <span>{reason}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
        {profitMargin !== undefined && (
          <MetricBox label="Kâr Marjı" value={`%${profitMargin}`} />
        )}
        {riskLevel && (
          <MetricBox label="Risk" value={riskLevel} />
        )}
        {cashNeed && (
          <MetricBox label="Nakit İhtiyacı" value={cashNeed} />
        )}
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  );
}
