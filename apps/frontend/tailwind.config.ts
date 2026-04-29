import type { Config } from 'tailwindcss';

const config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config;

export default config;
