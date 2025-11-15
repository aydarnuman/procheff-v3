'use client';

import { motion } from 'framer-motion';
import { Save, Download, Undo2, Redo2, Clock, CheckCircle2 } from 'lucide-react';

import { useAutoSave, useAutoSaveStatus } from '@/lib/hooks/useAutoSave';
import { fadeInDown } from '@/lib/utils/animation-variants';

interface ProposalHeaderProps {
  title: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function ProposalHeader({
  title,
  data,
  onSave,
  onExport,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: ProposalHeaderProps) {
  const { isSaving, lastSaved, forceSave } = useAutoSave({
    data,
    onSave,
    interval: 3000,
    enabled: true,
    debounce: 1000
  });

  const saveStatus = useAutoSaveStatus(lastSaved, isSaving);

  return (
    <motion.div
      className="glass-card rounded-xl p-5 mb-6"
      variants={fadeInDown}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        {/* Left: Title & Auto-save Status */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Kaydediliyor...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">{saveStatus}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">Henüz kaydedilmedi</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex gap-1">
            <motion.button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded-lg hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              whileHover={canUndo ? { scale: 1.05 } : undefined}
              whileTap={canUndo ? { scale: 0.95 } : undefined}
              title="Geri al (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5 text-slate-400" />
            </motion.button>

            <motion.button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded-lg hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              whileHover={canRedo ? { scale: 1.05 } : undefined}
              whileTap={canRedo ? { scale: 0.95 } : undefined}
              title="İleri al (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-5 h-5 text-slate-400" />
            </motion.button>
          </div>

          {/* Manual Save */}
          <motion.button
            onClick={forceSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 disabled:bg-slate-700 text-indigo-400 rounded-lg transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Kaydet</span>
          </motion.button>

          {/* Export */}
          {onExport && (
            <motion.button
              onClick={onExport}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
