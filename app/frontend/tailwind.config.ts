import type { Config } from "tailwindcss";

const config = {
  theme: {
    extend: {
      fontFamily: {
        geistSans: ["Geist", "system-ui", "sans-serif"],
        geistMono: ["Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
} satisfies Config;

export default config;
