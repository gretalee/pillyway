import type { Config } from 'tailwindcss';

const config = {
  theme: {
    extend: {
      fontFamily: {
        casper: ['Casper', 'sans-serif'],
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      colors: {
        pillyGreen: {
          50: '#f1fcf6',
          100: '#e0f8eb',
          200: '#c2f0d8',
          300: '#93e392',
          400: '#5bcd93',
          500: '#34b373',
          600: '#238855',
          700: '#21744b',
          800: '#1f5c3e',
          900: '#1b4c35',
          950: '#0a291b',
        },
      },
      // Upwards shadow
      boxShadow: {
        'up-sm': '0 -1px 2px 0 rgb(0 0 0 / 0.05)',
        up: '0 -1px 3px 0 rgb(0 0 0 / 0.1), 0 -1px 2px -1px rgb(0 0 0 / 0.1)',
        'up-md': '0 -4px 6px -1px rgb(0 0 0 / 0.1), 0 -2px 4px -2px rgb(0 0 0 / 0.1)',
        'up-lg': '0 -10px 15px -3px rgb(0 0 0 / 0.1), 0 -4px 6px -4px rgb(0 0 0 / 0.1)',
        'up-xl': '0 -20px 25px -5px rgb(0 0 0 / 0.1), 0 -8px 10px -6px rgb(0 0 0 / 0.1)',
        'up-2xl': '0 -25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
} satisfies Config;

export default config;
