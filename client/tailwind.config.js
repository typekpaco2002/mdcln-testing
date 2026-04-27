/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables — work in both dark and light.
        background: "var(--bg-page)",
        foreground: "var(--text-primary)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          hover: "var(--bg-surface-hover)",
          elevated: "var(--bg-elevated)",
        },
        card: {
          DEFAULT: "var(--bg-content)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--text-muted)",
        },
        border: "var(--border-subtle)",
        "border-strong": "var(--border-medium)",
        input: "var(--bg-input)",
        ring: "var(--ring)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          foreground: "var(--accent-foreground)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",

        // Legacy palette — kept so pages using `apple-*` classes don't break.
        "apple-gray": {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        "apple-blue": {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
        "apple-purple": {
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
        },
      },
      fontFamily: {
        // Default sans — Inter (Linear/Vercel-style precision).
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Alt: DM Sans — kept for places explicitly using `font-dm`.
        dm: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
        // Display — Syne for landers / hero type.
        display: ["var(--font-syne)", "Syne", "system-ui", "sans-serif"],
        // SF kept for components using it.
        sf: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
        // Monospace for numeric / code.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Tightened editorial scale — keeps existing utilities but more precise line heights.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
      },
      borderRadius: {
        xs: "4px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        sharp: "0 1px 0 0 var(--border-subtle)",
        ring: "inset 0 0 0 1px var(--border-subtle)",
        "ring-strong": "inset 0 0 0 1px var(--border-medium)",
        elev1: "0 1px 2px var(--shadow-ambient), 0 0 0 1px var(--border-subtle)",
        elev2: "0 4px 12px var(--shadow-ambient), 0 0 0 1px var(--border-subtle)",
        elev3: "0 10px 32px var(--shadow-ambient), 0 0 0 1px var(--border-subtle)",
        accent: "0 0 0 1px var(--accent), 0 8px 24px var(--accent-soft)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
