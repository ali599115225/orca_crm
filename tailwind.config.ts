// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════
        // NovaCore v3 — Brand Palette
        // ═══════════════════════════════════════════
        nc: {
          bg: "#0b1120",
          "bg-light": "#f8fafc",
          surface: "#151f32",
          "surface-solid": "#151f32",
          "surface-light": "#ffffff",
          glass: "rgba(255, 255, 255, 0.03)",
          "glass-strong": "rgba(255, 255, 255, 0.06)",
          "glass-border": "rgba(148, 163, 184, 0.08)",
          "glass-border-hover": "rgba(223, 123, 98, 0.2)",
          "text-primary": "#1e293b",
          "text-primary-dark": "#f8fafc",
          "text-secondary": "#475569",
          "text-secondary-dark": "#cbd5e1",
          "text-dim": "#94a3b8",
          accent: "#df7b62",
          "accent-hover": "#c9644c",
          "accent-hover-dark": "#e89680",
          "accent-soft": "rgba(223, 123, 98, 0.08)",
          "accent-border": "rgba(223, 123, 98, 0.2)",
          glow: "rgba(223, 123, 98, 0.12)",
          "glow-strong": "rgba(223, 123, 98, 0.22)",
          "coral-bg": "rgba(223, 123, 98, 0.08)",
        },

        // ═══════════════════════════════════════════
        // Semantic / Status Colors
        // ═══════════════════════════════════════════
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        purple: "#A78BFA",

        // ═══════════════════════════════════════════
        // Pipeline Stage Accents (used in Kanban)
        // ═══════════════════════════════════════════
        stage: {
          new: "#3B82F6",
          contacted: "#0EA5E9",
          qualified: "#8B5CF6",
          tour: "#F59E0B",
          offer: "#EC4899",
          negotiation: "#F97316",
          closed: "#22C55E",
        },

        // ═══════════════════════════════════════════
        // Pricing (Subscription Tiers)
        // ═══════════════════════════════════════════
        pricing: {
          gold: "#d4af37",
          "gold-soft": "#e5c158",
          "gold-bg": "rgba(212, 175, 55, 0.1)",
          bronze: "#cd7f32",
          "bronze-soft": "#735334",
          "bronze-bg": "rgba(205, 127, 50, 0.08)",
          silver: "#C0C0C0",
          "silver-bg": "rgba(192, 192, 192, 0.06)",
        },

        // ═══════════════════════════════════════════
        // Corporate / Landing Page (CorporateHome)
        // ═══════════════════════════════════════════
        corporate: {
          bg: "#111111",
          "bg-light": "#161620",
          "bg-card": "#181818",
          "bg-hover": "#2e2e2e",
          surface: "rgba(22, 22, 28, 0.88)",
          "surface-alt": "rgba(22, 22, 28, 0.92)",
          "surface-light": "rgba(17, 17, 17, 0.85)",
          accent: "#007BFF",
          "accent-hover": "#0066dd",
          "accent-glow": "rgba(0, 123, 255, 0.45)",
          "accent-light": "#1a88ff",
          "accent-text": "#5aabff",
          "accent-soft": "rgba(0, 123, 255, 0.08)",
          "accent-border": "rgba(0, 123, 255, 0.25)",
          "accent-border-light": "rgba(0, 123, 255, 0.1)",
          text: "#64748b",
          "text-light": "#94a3b8",
          "text-heading": "#f1f5f9",
          "text-muted": "#475569",
          "text-dim": "#334155",
          silver: "#C0C0C0",
          green: "#22c55e",
          red: "#ff5f57",
          yellow: "#febc2e",
          green2: "#28c840",
          "glass-border": "rgba(255, 255, 255, 0.08)",
          "glass-border-light": "rgba(255, 255, 255, 0.05)",
          "glass-bg": "rgba(255, 255, 255, 0.04)",
          "glass-bg-soft": "rgba(255, 255, 255, 0.03)",
        },

        // ═══════════════════════════════════════════
        // Legacy — kept for backward compat
        // ═══════════════════════════════════════════
        void: "#030712",
        "light-bg": "#F1F5F9",
        "cyan-glow": "#00E5FF",
        "corporate-blue": "#2563EB",

        // ═══════════════════════════════════════════
        // SVG Tactile
        // ═══════════════════════════════════════════
        svg: {
          cyan: "#0ea5e9",
          "cyan-dark": "#38bdf8",
          stroke: "#94a3b8",
          "stroke-dark": "#475569",
        },
      },
      fontFamily: {
        sans: ["Calibri", "Cairo", "Inter", "sans-serif"],
        heading: ["Calibri", "Cairo", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Monaco", "monospace"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        full: "9999px",
      },
      boxShadow: {
        glow: "0 0 16px rgba(223, 123, 98, 0.12)",
        "glow-strong": "0 0 24px rgba(223, 123, 98, 0.22)",
      },
      backgroundImage: {
        "gradient-hud": "linear-gradient(135deg, #df7b62, #c9644c)",
        "gradient-hud-dark": "linear-gradient(135deg, #df7b62, #e89680)",
        "gradient-danger": "linear-gradient(135deg, #EF4444, #DC2626)",
      },
      animation: {
        scan: "ncScan 4s ease-in-out infinite",
        pulse: "ncPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fade: "ncFadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        ncScan: {
          "0%": { left: "-60%" },
          "100%": { left: "160%" },
        },
        ncPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        ncFadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
