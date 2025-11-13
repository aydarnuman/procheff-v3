'use client';

import { motion } from 'framer-motion';
import {
  Database,
  Brain,
  Sparkles,
  Keyboard,
  ChevronRight
} from 'lucide-react';
import type { TabType } from './EnhancedAnalysisResults';

interface TabBadge {
  count: number;
  color: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
}

interface EnhancedTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badges?: Partial<Record<TabType, TabBadge>>;
}

const TABS = [
  {
    id: 'extraction' as TabType,
    label: 'Veri Çıkarımı',
    icon: Database,
    shortcut: 'Alt+1',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-400'
  },
  {
    id: 'contextual' as TabType,
    label: 'Bağlamsal Analiz',
    icon: Brain,
    shortcut: 'Alt+2',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    textColor: 'text-purple-400'
  },
  {
    id: 'deep' as TabType,
    label: 'Derin Analiz',
    icon: Sparkles,
    shortcut: 'Alt+3',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    textColor: 'text-green-400'
  }
];

const getBadgeColor = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-black'
  };
  return colorMap[color] || 'bg-slate-600 text-white';
};

export function EnhancedTabNavigation({
  activeTab,
  onTabChange,
  badges = {}
}: EnhancedTabNavigationProps) {
  return (
    <div className="relative">
      {/* Tab Container */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-xl">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const badge = badges[tab.id];

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 group
                ${isActive 
                  ? `${tab.bgColor} ${tab.borderColor} border` 
                  : 'hover:bg-slate-800/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 bg-linear-to-r ${tab.color} opacity-10 rounded-lg`}
                  transition={{
                    type: "spring" as const,
                    stiffness: 300,
                    damping: 30
                  }}
                />
              )}

              {/* Icon */}
              <div className="relative z-10">
                <Icon className={`w-5 h-5 ${isActive ? tab.textColor : 'text-slate-400'}`} />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -inset-1 bg-linear-to-r ${tab.color} blur-lg opacity-50`}
                  />
                )}
              </div>

              {/* Label */}
              <span className={`relative z-10 font-medium ${
                isActive ? 'text-white' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>

              {/* Badge */}
              {badge && badge.count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    relative z-10 px-2 py-0.5 text-xs font-bold rounded-full
                    ${getBadgeColor(badge.color)}
                  `}
                >
                  {badge.count}
                </motion.span>
              )}

              {/* Keyboard Shortcut */}
              <span className={`
                hidden lg:block text-xs px-2 py-1 rounded
                ${isActive 
                  ? 'bg-slate-800/50 text-slate-300' 
                  : 'bg-slate-800/30 text-slate-500'
                }
                opacity-0 group-hover:opacity-100 transition-opacity
              `}>
                {tab.shortcut}
              </span>

              {/* Separator */}
              {index < TABS.length - 1 && !isActive && TABS[index + 1].id !== activeTab && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-slate-700" />
              )}
            </motion.button>
          );
        })}

        {/* Progress Indicator */}
        <div className="ml-auto flex items-center gap-2 px-3">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <div
                key={tab.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  badges[tab.id]?.count ? tab.bgColor : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {Object.values(badges).filter(b => b.count > 0).length}/{TABS.length} tamamlandı
          </span>
        </div>
      </div>

      {/* Tab Actions */}
      <div className="absolute right-0 top-full mt-2 flex items-center gap-2 text-xs text-slate-500">
        <Keyboard className="w-3 h-3" />
        <span>Hızlı geçiş için Alt+[1-3] kullanın</span>
      </div>

      {/* Mobile Swipe Indicator */}
      <div className="lg:hidden absolute left-1/2 -translate-x-1/2 -bottom-6 flex items-center gap-1 text-xs text-slate-500">
        <ChevronRight className="w-3 h-3 rotate-180" />
        <span>Kaydır</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}
