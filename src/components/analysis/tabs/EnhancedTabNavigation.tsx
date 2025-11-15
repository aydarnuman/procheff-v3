'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ProgressBadge, NotificationBadge } from '@/components/shared/ui/Badge';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

export type TabType = 'data-pool' | 'contextual' | 'deep';

interface Tab {
  id: TabType;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  progress?: number;
  notifications?: number;
  shortcut?: string;
}

interface EnhancedTabNavigationProps {
  tabs: Tab[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}

export function EnhancedTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: EnhancedTabNavigationProps) {
  // Keyboard shortcuts
  useKeyboardShortcuts(
    tabs.map((tab, index) => ({
      key: `ctrl+${index + 1}`,
      action: () => onTabChange(tab.id),
      description: `${tab.name} sekmesine git`
    }))
  );

  return (
    <div className={`flex gap-2 mb-6 overflow-x-auto pb-2 ${className}`}>
      {tabs.map((tab, _index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap
              ${isActive
                ? `bg-linear-to-r ${tab.color} text-white shadow-lg`
                : 'glass-card hover:bg-slate-800/50 text-slate-400 hover:text-white'
              }
            `}
            whileHover={!isActive ? { scale: 1.02, y: -2 } : undefined}
            whileTap={{ scale: 0.98 }}
            layout
          >
            {/* Icon */}
            <Icon className="w-5 h-5" />

            {/* Tab name & description */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{tab.name}</span>

                {/* Keyboard shortcut */}
                {tab.shortcut && !isActive && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {tab.shortcut}
                  </span>
                )}
              </div>

              {/* Description - only show on active tab */}
              {isActive && (
                <motion.span
                  className="text-xs opacity-80 mt-0.5"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 0.8, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {tab.description}
                </motion.span>
              )}
            </div>

            {/* Progress badge */}
            {tab.progress !== undefined && tab.progress < 100 && !isActive && (
              <ProgressBadge
                progress={tab.progress}
                variant={tab.progress >= 75 ? 'success' : tab.progress >= 50 ? 'warning' : 'error'}
                className="ml-1"
              />
            )}

            {/* Notification badge */}
            {tab.notifications && tab.notifications > 0 && !isActive && (
              <NotificationBadge
                count={tab.notifications}
                variant="error"
              />
            )}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
