"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Template component for smooth page transitions
 * Automatically wraps all pages with fade-in/fade-out animations
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/template
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          duration: 0.4, 
          ease: "easeInOut" 
        }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
