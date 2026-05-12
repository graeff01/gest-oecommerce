import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-soft": "rgb(var(--primary-soft) / <alpha-value>)",
        "primary-fg": "rgb(var(--primary-fg) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        "success-soft": "rgb(var(--success-soft) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        "warning-soft": "rgb(var(--warning-soft) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        "danger-soft": "rgb(var(--danger-soft) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        "info-soft": "rgb(var(--info-soft) / <alpha-value>)",
        // legados (usados em alguns lugares ainda)
        ink: "rgb(var(--fg) / <alpha-value>)",
        coal: "rgb(var(--fg) / <alpha-value>)",
        paper: "rgb(var(--surface-2) / <alpha-value>)",
        azure: "rgb(var(--primary) / <alpha-value>)",
        sage: "rgb(var(--success) / <alpha-value>)",
        clay: "rgb(var(--danger) / <alpha-value>)",
        brass: "rgb(var(--warning) / <alpha-value>)",
        lime: "rgb(var(--accent) / <alpha-value>)",
        ice: "rgb(var(--primary-soft) / <alpha-value>)",
        mist: "rgb(var(--surface-2) / <alpha-value>)",
        linen: "rgb(var(--surface-3) / <alpha-value>)",
        navy: "rgb(var(--surface-3) / <alpha-value>)"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        display: [
          "var(--font-display)",
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 8px 24px -10px rgb(var(--shadow) / 0.18), 0 2px 6px -2px rgb(var(--shadow) / 0.12)",
        elev: "0 18px 40px -16px rgb(var(--shadow) / 0.32), 0 6px 14px -8px rgb(var(--shadow) / 0.18)",
        glow: "0 0 0 1px rgb(var(--primary) / 0.18), 0 12px 32px -8px rgb(var(--primary) / 0.32)",
        ring: "0 0 0 4px rgb(var(--primary) / 0.16)"
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in .35s ease-out both",
        shimmer: "shimmer 2.6s linear infinite",
        "pulse-soft": "pulse-soft 2.6s ease-in-out infinite",
        "scale-in": "scale-in .28s cubic-bezier(.22,.9,.32,1) both"
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)",
        "gradient-accent":
          "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-2)) 100%)",
        "gradient-aurora":
          "radial-gradient(60% 80% at 10% 0%, rgb(var(--primary) / .18) 0%, transparent 60%), radial-gradient(50% 70% at 100% 100%, rgb(var(--accent) / .14) 0%, transparent 60%)"
      }
    }
  },
  plugins: []
};

export default config;
