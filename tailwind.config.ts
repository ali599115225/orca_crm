// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // هذا السطر يغطي مجلد app ومجلد operations والمجلدات الفرعية بالكامل
  ],
  theme: {
    extend: {
      colors: {
        void: "#030712",
        lightBg: "#F1F5F9",
        "cyan-glow": "#00E5FF",
        "corporate-blue": "#2563EB",
      },
      fontFamily: {
        sans: ["Calibri", "Cairo", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;