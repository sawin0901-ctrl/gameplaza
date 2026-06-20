/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7c3aed',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
        },
        // Семантические цвета на основе CSS-переменных
        // Используются в новых компонентах вместо хардкодных hex
        surface: 'var(--bg)',
        'surface-secondary': 'var(--bg-secondary)',
        'card-bg': 'var(--card)',
        'card-hover': 'var(--card-hover)',
        'border-default': 'var(--border)',
        'text-base': 'var(--text)',
        'text-secondary': 'var(--text-2)',
        'text-muted': 'var(--text-3)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
