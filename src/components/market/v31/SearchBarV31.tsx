'use client';

import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchBarV31Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
}

export function SearchBarV31({
  value,
  onChange,
  onSubmit,
  loading = false,
  error = null,
  placeholder = 'Ürün adı yazın...'
}: SearchBarV31Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      onSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Search Input */}
      <div className="flex gap-3 items-center">
        {/* Input */}
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            className="
              w-full pl-12 pr-4 py-4
              bg-[#0D0F16]/60
              backdrop-blur-xl
              border border-white/10
              rounded-xl
              text-white text-base
              placeholder:text-slate-500
              focus:outline-none
              focus:border-indigo-500/50
              focus:ring-2 focus:ring-indigo-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              hover:border-white/20
            "
          />
        </div>

        {/* Button */}
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="
            px-8 py-4
            bg-gradient-to-r from-indigo-500 to-purple-500
            hover:from-indigo-600 hover:to-purple-600
            disabled:from-slate-700 disabled:to-slate-700
            disabled:cursor-not-allowed
            rounded-xl
            transition-all duration-300
            text-white font-semibold text-base
            flex items-center gap-3
            shadow-lg shadow-indigo-500/20
            hover:shadow-indigo-500/40
            hover:scale-[1.02]
            active:scale-[0.98]
            disabled:shadow-none
            disabled:hover:scale-100
          "
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="hidden sm:inline">Sorgulanıyor</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline">Fiyat Getir</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
