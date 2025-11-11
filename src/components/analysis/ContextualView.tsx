'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Activity
} from 'lucide-react';
import type { ContextualAnalysis } from '@/lib/tender-analysis/types';

interface ContextualViewProps {
  analysis: ContextualAnalysis;
}

export function ContextualView({ analysis }: ContextualViewProps) {
  // Risk level colors
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'dusuk':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'orta':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'yuksek':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'dusuk':
        return <CheckCircle className="w-5 h-5" />;
      case 'orta':
        return <AlertCircle className="w-5 h-5" />;
      case 'yuksek':
        return <XCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Genel Değerlendirme
            </h3>
            <p className="text-slate-300">{analysis.genel_degerlendirme.ozet}</p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(analysis.genel_degerlendirme.puan)}`}>
              {analysis.genel_degerlendirme.puan}
            </div>
            <div className="text-xs text-slate-400 mt-1">Puan</div>
          </div>
        </div>

        {/* Recommendations */}
        {analysis.genel_degerlendirme.oneriler.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Öneriler:</h4>
            <ul className="space-y-1">
              {analysis.genel_degerlendirme.oneriler.map((oneri, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-400">{oneri}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* Risk Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operational Risks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">Operasyonel Riskler</h3>
            </div>
            <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getRiskColor(analysis.operasyonel_riskler.seviye)}`}>
              {getRiskIcon(analysis.operasyonel_riskler.seviye)}
              <span className="text-sm font-medium capitalize">
                {analysis.operasyonel_riskler.seviye}
              </span>
            </div>
          </div>

          {/* Risk Score Gauge */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Risk Skoru</span>
              <span>{analysis.operasyonel_riskler.skor}/100</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.operasyonel_riskler.skor}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full ${
                  analysis.operasyonel_riskler.skor < 40 ? 'bg-green-500' :
                  analysis.operasyonel_riskler.skor < 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
          </div>

          {/* Risk Reasons */}
          <div className="space-y-2">
            {analysis.operasyonel_riskler.nedenler.slice(0, 3).map((neden, i) => (
              <div key={i} className="p-2 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{neden.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Kaynak:</span>
                  {neden.source_ref.map((ref, j) => (
                    <span key={j} className="text-xs bg-slate-700/50 px-1 rounded">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Measures */}
          {analysis.operasyonel_riskler.onlemler.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Önerilen Önlemler:</p>
              <ul className="space-y-1">
                {analysis.operasyonel_riskler.onlemler.map((onlem, i) => (
                  <li key={i} className="text-xs text-slate-400">• {onlem}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Cost Deviation Risk */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Maliyet Sapma Riski</h3>
          </div>

          {/* Deviation Rate */}
          <div className="mb-4">
            <div className="text-3xl font-bold text-white">
              %{Math.round(analysis.maliyet_sapma_olasiligi.oran * 100)}
            </div>
            <div className="text-sm text-slate-400">Sapma Olasılığı</div>
          </div>

          {/* Deviation Factors */}
          <div className="space-y-2">
            {analysis.maliyet_sapma_olasiligi.faktorler.map((faktor, i) => (
              <div key={i} className="p-2 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{faktor.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Activity className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-500">
                    Güven: {Math.round(faktor.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {analysis.maliyet_sapma_olasiligi.tahmini_sapma_miktari && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">Tahmini Sapma:</p>
              <p className="text-lg font-semibold text-orange-400">
                {analysis.maliyet_sapma_olasiligi.tahmini_sapma_miktari.toLocaleString('tr-TR')} TL
              </p>
            </div>
          )}
        </motion.div>

        {/* Time Suitability */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Zaman Uygunluğu</h3>
            </div>
            <div className={`px-3 py-1 rounded-full ${
              analysis.zaman_uygunlugu.yeterli
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {analysis.zaman_uygunlugu.yeterli ? 'Yeterli' : 'Yetersiz'}
            </div>
          </div>

          {/* Time Analysis */}
          <div className="space-y-2">
            {analysis.zaman_uygunlugu.gun_analizi.map((analiz, i) => (
              <div key={i} className="p-2 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{analiz.text}</p>
              </div>
            ))}
          </div>

          {/* Critical Dates */}
          {analysis.zaman_uygunlugu.kritik_tarihler.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500 font-medium">Kritik Tarihler:</p>
              {analysis.zaman_uygunlugu.kritik_tarihler.map((tarih, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                  <span className="text-sm text-slate-300">{tarih.aciklama}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(tarih.tarih).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Personnel Requirement */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-semibold text-white">Personel Gereksinimi</h3>
          </div>

          {/* Personnel Count */}
          <div className="mb-4">
            <div className="text-3xl font-bold text-white">
              {analysis.personel_gereksinimi.tahmini_sayi}
            </div>
            <div className="text-sm text-slate-400">Tahmini Personel</div>
          </div>

          {/* Critical Positions */}
          {analysis.personel_gereksinimi.kritik_pozisyonlar.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">Kritik Pozisyonlar:</p>
              <div className="flex flex-wrap gap-2">
                {analysis.personel_gereksinimi.kritik_pozisyonlar.map((pozisyon, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg"
                  >
                    {pozisyon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personnel Details */}
          {analysis.personel_gereksinimi.detay.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              {analysis.personel_gereksinimi.detay.slice(0, 2).map((detay, i) => (
                <p key={i} className="text-sm text-slate-400 mb-1">
                  • {detay.text}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Equipment Requirements */}
      {analysis.ekipman_ihtiyaci.kritik_ekipmanlar.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white">Ekipman İhtiyacı</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">Kritik Ekipmanlar:</p>
              <div className="space-y-1">
                {analysis.ekipman_ihtiyaci.kritik_ekipmanlar.map((ekipman, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    <span className="text-sm text-slate-300">{ekipman}</span>
                  </div>
                ))}
              </div>
            </div>

            {analysis.ekipman_ihtiyaci.tahmini_maliyet && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Tahmini Maliyet:</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {analysis.ekipman_ihtiyaci.tahmini_maliyet.toLocaleString('tr-TR')} TL
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}