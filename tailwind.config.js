/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Printing ink, for the scripture text on the Bible pages.
        ink: {
          700: '#3d342a',
          800: '#2b241c',
          900: '#1c1811',
        },
        // "Wayfinding": the redesign's palette. Signage charcoal and stone,
        // cobalt for the thing you are doing, amber for the thing to press,
        // crimson for "you are here" and for danger.
        wf: {
          ink: '#23262b',
          ink2: '#31353c',
          line: '#4a5059',
          line2: '#5b616a',
          paper: '#f2f0ea',
          stage: '#e6e3db',
          mist: '#e3e8e8',
          mist2: '#d2d9d9',
          track: '#bfc6cb',
          off: '#c5ccd0',
          field: '#9aa1a8',
          fieldoff: '#f1f3f3',
          muted: '#4b5158',
          muted2: '#3d434a',
          ondark: '#c9ccd2',
          ondark2: '#b9bec6',
          cobalt: '#2753b8',
          cobaltdeep: '#1f4699',
          cobaltwash: '#dbe4f7',
          cobalttint: '#e6ecfa',
          navy: '#1f3f8f',
          navydeep: '#173375',
          amber: '#e3a52b',
          amberhi: '#eab54d',
          crimson: '#a8283a',
          crimsondeep: '#7d1d2b',
          crimsontint: '#f7e3e5',
          crimsonwash: '#fbf1f2',
          teal: '#2f6f6b',
          tealtint: '#e1eeec',
          ochre: '#b07d14',
        },
      },
      fontFamily: {
        scripture: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        wf: ['Overpass', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'wf-drop': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'wf-rise': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'wf-urgent': {
          '0%,100%': { backgroundColor: '#a8283a' },
          '50%': { backgroundColor: '#7d1d2b' },
        },
      },
      animation: {
        'wf-drop': 'wf-drop 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'wf-rise': 'wf-rise 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'wf-urgent': 'wf-urgent 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
