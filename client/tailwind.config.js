/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        auction: {
          bg: '#0a0e1a',
          card: '#111827',
          surface: '#1a1f35',
          border: '#2a3352',
          gold: '#fbbf24',
          silver: '#94a3b8',
          bronze: '#d97706',
          platinum: '#e2e8f0',
        },
        ipl: {
          blue: '#004ba0',
          gold: '#d4af37',
          purple: '#6b21a8',
          orange: '#ea580c',
          red: '#dc2626',
          green: '#16a34a',
          cyan: '#06b6d4',
          pink: '#ec4899',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-ipl': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-gold': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        'gradient-premium': 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #4c1d95 100%)',
        'gradient-success': 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        'gradient-danger': 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        'gradient-card': 'linear-gradient(145deg, #1a1f35 0%, #111827 100%)',
        'gradient-highlight': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.3)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.5)',
        'gold': '0 0 20px rgba(251, 191, 36, 0.4)',
        'success': '0 0 20px rgba(16, 185, 129, 0.4)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
