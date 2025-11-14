'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';

export interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low' | 'stale';
  source: 'api' | 'scraper' | 'crowd' | 'ai' | 'cache';
  confidence: number; // 0-1
  lastUpdated?: Date;
  message?: string;
}

interface DataConfidenceIndicatorProps {
  confidence: ConfidenceLevel;
  showDetails?: boolean;
  compact?: boolean;
}

export function DataConfidenceIndicator({ 
  confidence, 
  showDetails = true,
  compact = false 
}: DataConfidenceIndicatorProps) {
  const getConfidenceConfig = () => {
    const configs = {
      high: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        label: 'Yüksek Güven',
        description: 'Doğrudan API verisi'
      },
      medium: {
        icon: Shield,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        label: 'Orta Güven',
        description: 'Web scraping verisi'
      },
      low: {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        label: 'Düşük Güven',
        description: 'Kullanıcı verisi veya tahmin'
      },
      stale: {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
        label: 'Eski Veri',
        description: 'Güncelleme gerekli'
      }
    };
    
    return configs[confidence.level];
  };
  
  const getSourceLabel = () => {
    const labels = {
      api: 'Market API',
      scraper: 'Web Verisi',
      crowd: 'Kullanıcı Verisi',
      ai: 'AI Tahmini',
      cache: 'Önbellek'
    };
    
    return labels[confidence.source] || 'Bilinmeyen';
  };
  
  const getTimeSince = (date?: Date) => {
    if (!date) return null;
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
  };
  
  const config = getConfidenceConfig();
  const Icon = config.icon;
  const timeSince = getTimeSince(confidence.lastUpdated);
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md
          ${config.bgColor} ${config.borderColor} border
        `}
      >
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          %{Math.round(confidence.confidence * 100)}
        </span>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-lg border-2
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-full
          ${config.bgColor} border-2 ${config.borderColor}
        `}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${config.color}`}>
              {config.label}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
              %{Math.round(confidence.confidence * 100)}
            </span>
          </div>
          
          {showDetails && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {confidence.message || config.description}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>Kaynak: {getSourceLabel()}</span>
                </div>
                
                {timeSince && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{timeSince}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {showDetails && confidence.level !== 'high' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.2 }}
          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {confidence.level === 'medium' && 
              'Bu veri web scraping ile elde edildi. Doğruluğu %80-95 aralığındadır.'}
            {confidence.level === 'low' && 
              'Bu veri kullanıcı girişi veya AI tahmini. Diğer kaynaklarla doğrulama önerilir.'}
            {confidence.level === 'stale' && 
              'Bu veri 24 saatten eski. Güncel fiyat bilgisi için yenileme yapın.'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// Confidence Badge Component for inline use
export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const config = {
    high: { color: 'text-green-600', bg: 'bg-green-100' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
    low: { color: 'text-orange-600', bg: 'bg-orange-100' },
    stale: { color: 'text-gray-600', bg: 'bg-gray-100' }
  };
  
  const style = config[confidence.level];
  
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      ${style.bg} ${style.color}
    `}>
      {Math.round(confidence.confidence * 100)}%
    </span>
  );
}
