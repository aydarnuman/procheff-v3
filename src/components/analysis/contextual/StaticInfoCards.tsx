'use client';

import { motion } from 'framer-motion';
import { Building2, Calendar, Briefcase, FileCheck, TrendingUp } from 'lucide-react';
import { AnimatedCounter } from '@/components/shared/animations/AnimatedCounter';
import { staggerContainer, staggerItem } from '@/lib/utils/animation-variants';

interface StaticInfoCardsProps {
  ihaleInfo?: {
    kurum: string;
    ihale_turu: string;
    tahmini_bedel?: number;
  };
  tarihler?: {
    ilan_tarihi?: string;
    son_basvuru?: string;
    sure?: string;
  };
  hizmetDetay?: {
    kisilik?: number;
    gunluk_ogun?: number;
    toplam_gun?: number;
  };
  belgeler?: {
    teknik_sartname: boolean;
    idari_sartname: boolean;
    sozlesme_taslaği: boolean;
    menu_listesi: boolean;
  };
}

export function StaticInfoCards({
  ihaleInfo,
  tarihler,
  hizmetDetay,
  belgeler
}: StaticInfoCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* 1. İhale Bilgileri */}
      {ihaleInfo && (
        <motion.div
          variants={staggerItem}
          className="glass-card p-5"
          whileHover={{ scale: 1.01, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">İhale Bilgileri</h3>
              <p className="text-slate-400 text-sm">Temel detaylar</p>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow label="Kurum" value={ihaleInfo.kurum} />
            <InfoRow label="İhale Türü" value={ihaleInfo.ihale_turu} />
            {ihaleInfo.tahmini_bedel && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Tahmini Bedel</span>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounter
                    value={ihaleInfo.tahmini_bedel}
                    decimals={2}
                    duration={1.2}
                    className="text-green-400 font-bold"
                  />
                  <span className="text-green-400 text-sm">TL</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 2. Tarihler & Süreler */}
      {tarihler && (
        <motion.div
          variants={staggerItem}
          className="glass-card p-5"
          whileHover={{ scale: 1.01, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Tarihler & Süreler</h3>
              <p className="text-slate-400 text-sm">Önemli tarihler</p>
            </div>
          </div>

          <div className="space-y-3">
            {tarihler.ilan_tarihi && (
              <InfoRow label="İlan Tarihi" value={tarihler.ilan_tarihi} />
            )}
            {tarihler.son_basvuru && (
              <InfoRow label="Son Başvuru" value={tarihler.son_basvuru} highlight />
            )}
            {tarihler.sure && (
              <InfoRow label="Süre" value={tarihler.sure} />
            )}
          </div>
        </motion.div>
      )}

      {/* 3. Hizmet Detayları */}
      {hizmetDetay && (
        <motion.div
          variants={staggerItem}
          className="glass-card p-5"
          whileHover={{ scale: 1.01, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Hizmet Detayları</h3>
              <p className="text-slate-400 text-sm">Kapsam bilgileri</p>
            </div>
          </div>

          <div className="space-y-3">
            {hizmetDetay.kisilik && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Kişilik</span>
                <AnimatedCounter
                  value={hizmetDetay.kisilik}
                  duration={0.8}
                  className="text-white font-semibold"
                  suffix=" kişi"
                />
              </div>
            )}
            {hizmetDetay.gunluk_ogun && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Günlük Öğün</span>
                <AnimatedCounter
                  value={hizmetDetay.gunluk_ogun}
                  duration={0.8}
                  className="text-white font-semibold"
                  suffix=" öğün"
                />
              </div>
            )}
            {hizmetDetay.toplam_gun && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Toplam Gün</span>
                <AnimatedCounter
                  value={hizmetDetay.toplam_gun}
                  duration={0.8}
                  className="text-white font-semibold"
                  suffix=" gün"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 4. Belgeler & Yeterlik */}
      {belgeler && (
        <motion.div
          variants={staggerItem}
          className="glass-card p-5"
          whileHover={{ scale: 1.01, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Belgeler & Yeterlik</h3>
              <p className="text-slate-400 text-sm">Gerekli dokümanlar</p>
            </div>
          </div>

          <div className="space-y-2">
            <CheckRow label="Teknik Şartname" checked={belgeler.teknik_sartname} />
            <CheckRow label="İdari Şartname" checked={belgeler.idari_sartname} />
            <CheckRow label="Sözleşme Taslağı" checked={belgeler.sozlesme_taslağı} />
            <CheckRow label="Menü Listesi" checked={belgeler.menu_listesi} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`font-medium ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-300 text-sm">{label}</span>
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center
        ${checked ? 'bg-green-500' : 'bg-slate-700'}
      `}>
        {checked && <span className="text-white text-xs">✓</span>}
      </div>
    </div>
  );
}
