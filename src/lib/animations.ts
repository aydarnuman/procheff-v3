/**
 * Reusable Framer Motion Animation Variants
 * Procheff v3 - Cinematic Effects
 */

import { Variants } from 'framer-motion';

// ========== FADE ANIMATIONS ==========

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// ========== SCALE ANIMATIONS ==========

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const scaleUp: Variants = {
  initial: { scale: 0.8 },
  animate: { scale: 1 },
  exit: { scale: 0.8 },
};

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  },
  exit: { opacity: 0, scale: 0.5 },
};

// ========== SLIDE ANIMATIONS ==========

export const slideInLeft: Variants = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 },
};

export const slideInRight: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

export const slideInUp: Variants = {
  initial: { y: 100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 100, opacity: 0 },
};

export const slideInDown: Variants = {
  initial: { y: -100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -100, opacity: 0 },
};

// ========== BLUR ANIMATIONS ==========

export const blurIn: Variants = {
  initial: { opacity: 0, filter: 'blur(10px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(10px)' },
};

export const blurScale: Variants = {
  initial: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
};

// ========== STAGGER ANIMATIONS ==========

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerFast: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerSlow: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

// ========== HOVER ANIMATIONS ==========

export const hoverScale = {
  scale: 1.05,
  transition: { duration: 0.2 },
};

export const hoverLift = {
  y: -4,
  transition: { duration: 0.2 },
};

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(74, 158, 255, 0.4)',
  transition: { duration: 0.3 },
};

export const hoverTilt = {
  rotateX: 2,
  rotateY: 2,
  transition: { duration: 0.2 },
};

// ========== TAP ANIMATIONS ==========

export const tapScale = {
  scale: 0.95,
};

export const tapShrink = {
  scale: 0.9,
};

// ========== ROTATION ANIMATIONS ==========

export const rotateIn: Variants = {
  initial: { opacity: 0, rotate: -180 },
  animate: { opacity: 1, rotate: 0 },
  exit: { opacity: 0, rotate: 180 },
};

export const flipIn: Variants = {
  initial: { opacity: 0, rotateY: -90 },
  animate: { opacity: 1, rotateY: 0 },
  exit: { opacity: 0, rotateY: 90 },
};

// ========== SPECIAL EFFECTS ==========

export const cardFlip: Variants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
};

export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear',
    },
  },
};

// ========== PAGE TRANSITIONS ==========

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

export const pageTransitionBlur = {
  initial: { opacity: 0, filter: 'blur(10px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(10px)' },
  transition: { duration: 0.4, ease: 'easeInOut' },
};

export const pageTransitionScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

// ========== SPRING PHYSICS ==========

export const springPhysics = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const springBouncy = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
};

export const springSmooth = {
  type: 'spring',
  stiffness: 200,
  damping: 35,
};

// ========== EASING CURVES ==========

export const easeInOutCubic = [0.4, 0, 0.2, 1];
export const easeOutExpo = [0.16, 1, 0.3, 1];
export const easeInOutQuart = [0.76, 0, 0.24, 1];

// ========== NUMBER COUNTER ANIMATION ==========

export const counterAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

// ========== PROGRESS BAR ==========

export const progressBar: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: { scaleX: 1 },
  exit: { scaleX: 0 },
};

// ========== GLOW PULSE ==========

export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(74, 158, 255, 0.4)',
      '0 0 40px rgba(74, 158, 255, 0.6)',
      '0 0 20px rgba(74, 158, 255, 0.4)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
