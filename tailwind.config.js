/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Aged paper, leather binding and gilt — the physical-book palette the
        // whole UI is built around.
        parchment: {
          50: '#fdfaf3',
          100: '#f8f1e2',
          200: '#efe2c8',
          300: '#e2cfa8',
          400: '#cdb182',
        },
        leather: {
          700: '#4a2c1a',
          800: '#3a2113',
          900: '#2a170d',
          950: '#1a0e07',
        },
        gilt: {
          400: '#d9b45b',
          500: '#c79a3c',
          600: '#a87c26',
        },
        ink: {
          700: '#3d342a',
          800: '#2b241c',
          900: '#1c1811',
        },
      },
      fontFamily: {
        scripture: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        display: ['Georgia', '"Times New Roman"', 'serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gilt-shimmer': {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'gilt-shimmer': 'gilt-shimmer 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
