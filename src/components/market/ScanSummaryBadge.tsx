'use client';

import React, { useState } from 'react';
import type { ScanSummary } from '@/lib/market/schema';

interface ScanSummaryBadgeProps {
  scanSummary: ScanSummary;
  showDetails?: boolean;
}

/**
 * Scan Summary Badge with Failure Details Modal
 *
 * Shows scan success/failure count with detailed failure reasons
 *
 * Fixes: "Başarısız scan sebepleri gizli" problemi
 *
 * **Features:**
 * - ✅ Success count (green badge)
 * - ❌ Failure count (red badge, clickable)
 * - 📋 Modal with detailed failure reasons
 * - 🔍 Failure category icons
 */
export default function ScanSummaryBadge({
  scanSummary,
  showDetails = true
}: ScanSummaryBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const { totalScanned, successful, failed, failureReasons } = scanSummary;

  // Failure reason icons and labels
  const failureInfo: Record<string, { icon: string; label: string; color: string }> = {
    timeout: { icon: '⏱️', label: 'Timeout', color: 'text-orange-400' },
    not_found: { icon: '🔍', label: 'Bulunamadı', color: 'text-yellow-400' },
    out_of_stock: { icon: '📦', label: 'Stok Yok', color: 'text-red-400' },
    api_error: { icon: '⚠️', label: 'API Hatası', color: 'text-red-500' },
    parsing_error: { icon: '🔧', label: 'Parse Hatası', color: 'text-purple-400' }
  };

  return (
    <>
      {/* Badge */}
      <div className="inline-flex items-center gap-2">
        {/* Success Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
          <span className="text-emerald-400 font-semibold">✓ {successful}</span>
          <span className="text-slate-400 text-xs">başarılı</span>
        </div>

        {/* Failure Badge (clickable) */}
        {failed > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors cursor-pointer"
            title="Hataları görüntüle"
          >
            <span className="text-red-400 font-semibold">✗ {failed}</span>
            <span className="text-slate-400 text-xs">başarısız</span>
            {showDetails && (
              <span className="text-slate-500 text-xs ml-1">👁️</span>
            )}
          </button>
        )}

        {/* Total */}
        <span className="text-slate-500 text-xs">
          / {totalScanned} toplam
        </span>
      </div>

      {/* Failure Details Modal */}
      {showModal && failed > 0 && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h3 className="h3 text-white flex items-center gap-2">
                  <span>❌</span>
                  <span>Başarısız Scanler</span>
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {failed} kaynak veri getirelemedi
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Failure List */}
            <div className="p-6 space-y-3">
              {failureReasons.map((failure, index) => {
                const info = failureInfo[failure.reason] || {
                  icon: '❓',
                  label: 'Bilinmeyen',
                  color: 'text-slate-400'
                };

                return (
                  <div
                    key={`failure-${index}`}
                    className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    {/* Icon */}
                    <div className="text-2xl">{info.icon}</div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {failure.source}
                        </span>
                        <span className={`text-sm ${info.color}`}>
                          {info.label}
                        </span>
                      </div>

                      {failure.details && (
                        <p className="text-sm text-slate-400 mt-1">
                          {failure.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 bg-slate-800/30">
              <p className="text-xs text-slate-400">
                💡 <span className="font-semibold">Not:</span> Başarısız scanler final fiyatı etkilemez.
                Diğer güvenilir kaynaklardan elde edilen veriler kullanılır.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
