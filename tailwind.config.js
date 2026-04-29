/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sasp: {
          bg: '#0F1420',
          navy: '#1B2A4E',
          'navy-light': '#243660',
          tan: '#C9B27A',
          'tan-dark': '#9F8A57',
          gold: '#D4A745',
          red: '#A33A3A',
          'red-dark': '#7A2828',
          ink: '#E8E4D7',
          'ink-dim': '#A8A493',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'gold-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 167, 69, 0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 167, 69, 0)' },
        },
      },
      animation: {
        'gold-pulse': 'gold-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
