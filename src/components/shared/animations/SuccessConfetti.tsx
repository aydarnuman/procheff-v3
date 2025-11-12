'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessConfettiProps {
  show: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

/**
 * Success Confetti Component
 * Animated confetti celebration effect
 *
 * @example
 * <SuccessConfetti show={saved} duration={3000} onComplete={() => setSaved(false)} />
 */
export function SuccessConfetti({
  show,
  duration = 3000,
  particleCount = 50,
  colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
  onComplete
}: SuccessConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    color: string;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (show) {
      // Generate random particles
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * -100 - 50,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.2
      }));

      setParticles(newParticles);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show, particleCount, colors, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
              style={{
                backgroundColor: particle.color,
                transform: `scale(${particle.scale})`
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0
              }}
              animate={{
                x: `${particle.x}vw`,
                y: `${particle.y}vh`,
                opacity: 0,
                rotate: particle.rotation
              }}
              transition={{
                duration: duration / 1000,
                delay: particle.delay,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Success Toast with Confetti
 */
export function SuccessToast({
  show,
  message,
  icon = '🎉',
  duration = 3000,
  showConfetti = true,
  onClose
}: {
  show: boolean;
  message: string;
  icon?: string;
  duration?: number;
  showConfetti?: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <>
      {showConfetti && <SuccessConfetti show={show} duration={duration} />}

      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed top-4 right-4 z-50 glass-card px-6 py-4 flex items-center gap-3"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <motion.span
              className="text-2xl"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: 2
              }}
            >
              {icon}
            </motion.span>
            <p className="text-white font-medium">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
