/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom gradient backgrounds for bg-linear-to-* utilities
      backgroundImage: {
        'linear-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'linear-to-l': 'linear-gradient(to left, var(--tw-gradient-stops))',
        'linear-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
        'linear-to-b': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
        'linear-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'linear-to-bl': 'linear-gradient(to bottom left, var(--tw-gradient-stops))',
        'linear-to-tr': 'linear-gradient(to top right, var(--tw-gradient-stops))',
        'linear-to-tl': 'linear-gradient(to top left, var(--tw-gradient-stops))',
      },
      // Custom colors (matching globals.css variables)
      colors: {
        'color-base': '#1a1d29',
        'color-surface': '#252836',
        'color-card': '#2d3142',
        'color-elevated': '#353849',
        'color-border': '#3d4158',
        'color-border-bright': '#4a5070',
        'color-accent-blue': '#06b6d4',
        'color-accent-mint': '#10b981',
        'color-accent-gold': '#f59e0b',
        'color-accent-red': '#ef4444',
        'color-accent-purple': '#8b5cf6',
      },
      // Animation and keyframes
      animation: {
        'ripple': 'ripple 0.6s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float-slow 20s ease-in-out infinite',
        'float-medium': 'float-medium 25s ease-in-out infinite',
        'float-fast': 'float-fast 18s ease-in-out infinite',
      },
      keyframes: {
        ripple: {
          'to': {
            width: '400px',
            height: '400px',
            opacity: '0',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 10px currentColor',
          },
          '50%': {
            opacity: '0.7',
            boxShadow: '0 0 20px currentColor',
          },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-40px, 40px) scale(1.15)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(25px, 25px) scale(1.05)' },
          '50%': { transform: 'translate(-25px, -25px) scale(0.95)' },
          '75%': { transform: 'translate(15px, -15px) scale(1.1)' },
        },
      },
      // Backdrop blur and filter
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
