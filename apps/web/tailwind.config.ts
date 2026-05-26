import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './libs/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8eaff',
          200: '#b8d8ff',
          300: '#85bcff',
          400: '#5095ff',
          500: '#2a70f5',
          600: '#1554dc',
          700: '#1442b3',
          800: '#163a8d',
          900: '#173470',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
