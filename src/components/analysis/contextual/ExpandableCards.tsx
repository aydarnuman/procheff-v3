'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, DollarSign, Users, Package, Wrench, Brain } from 'lucide-react';
import { expand } from '@/lib/utils/animation-variants';

interface CardData {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof DollarSign;
  color: string;
  content: React.ReactNode;
  badge?: string;
}

interface ExpandableCardsProps {
  cards: CardData[];
}

export function ExpandableCards({ cards }: ExpandableCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isExpanded = expandedId === card.id;

        return (
          <motion.div
            key={card.id}
            className="glass-card overflow-hidden"
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header - Always visible */}
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              onClick={() => toggleCard(card.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-semibold">{card.title}</h3>
                  <p className="text-slate-400 text-sm">{card.subtitle}</p>
                </div>
                {card.badge && (
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full ml-2">
                    {card.badge}
                  </span>
                )}
              </div>

              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-slate-400" />
              </motion.div>
            </button>

            {/* Content - Expandable */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  variants={expand}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="border-t border-slate-700"
                >
                  <div className="px-5 py-4">
                    {card.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// Example usage helpers
export function createMaliyetCard(data: {
  toplam: number;
  yemek: number;
  personel: number;
  operasyonel: number;
}): CardData {
  return {
    id: 'maliyet',
    title: 'Maliyet & Teminatlar',
    subtitle: `${data.toplam.toLocaleString('tr-TR')} TL toplam`,
    icon: DollarSign,
    color: 'bg-green-500/20 text-green-400',
    content: (
      <div className="space-y-3">
        <CostRow label="Yemek Maliyeti" value={data.yemek} />
        <CostRow label="Personel Maliyeti" value={data.personel} />
        <CostRow label="Operasyonel" value={data.operasyonel} />
        <div className="pt-3 border-t border-slate-700">
          <CostRow label="TOPLAM" value={data.toplam} highlight />
        </div>
      </div>
    )
  };
}

export function createPersonelCard(personel: Array<{ pozisyon: string; adet: number; maas: number }>): CardData {
  return {
    id: 'personel',
    title: 'Personel Listesi',
    subtitle: `${personel.length} pozisyon`,
    icon: Users,
    color: 'bg-blue-500/20 text-blue-400',
    badge: `${personel.reduce((sum, p) => sum + p.adet, 0)} kişi`,
    content: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700">
            <tr className="text-slate-400">
              <th className="text-left py-2">Pozisyon</th>
              <th className="text-center py-2">Adet</th>
              <th className="text-right py-2">Maaş</th>
            </tr>
          </thead>
          <tbody>
            {personel.map((p, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="text-white py-2">{p.pozisyon}</td>
                <td className="text-center text-slate-300">{p.adet}</td>
                <td className="text-right text-green-400">{p.maas.toLocaleString('tr-TR')} TL</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  };
}

function CostRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${highlight ? 'text-white font-semibold' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`font-medium ${highlight ? 'text-green-400 text-lg' : 'text-white'}`}>
        {value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
      </span>
    </div>
  );
}
