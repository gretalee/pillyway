import type { Config } from 'tailwindcss';

const config = {
  theme: {
    extend: {
      fontFamily: {
        canaro: ['Canaro', 'sans-serif'],
        casper: ['Casper', 'sans-serif'],
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      colors: {
        pillyGreen: {
          50: '#f1fcf6',
          100: '#e0f8eb',
          200: '#c2f0d8',
          300: '#92e3ba',
          400: '#5bcd93',
          500: '#34b373',
          600: '#238855',
          700: '#21744b',
          800: '#1f5c3e',
          900: '#1b4c35',
          950: '#0a291b',
        },
      },
    },
  },
} satisfies Config;

export default config;
