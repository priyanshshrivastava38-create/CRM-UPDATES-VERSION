import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        appbg: "var(--app-bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        line: "var(--line)",
        panel: "var(--panel)",
        brand: {
          50: "#eff5ff",
          100: "#dce9ff",
          200: "#b8d1ff",
          300: "#89b3ff",
          400: "#5b8fff",
          500: "#3667f0",
          600: "#2648d6",
          700: "#1f39ab",
          800: "#1c2f85",
          900: "#182860"
        }
      },
      boxShadow: {
        soft: "0 24px 70px -12px rgba(15, 23, 42, 0.16)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 28px -14px rgba(15, 23, 42, 0.14)",
        "card-hover": "0 1px 2px rgba(15, 23, 42, 0.06), 0 20px 40px -12px rgba(15, 23, 42, 0.2)",
        glow: "0 0 0 1px rgba(54, 103, 240, 0.15), 0 8px 24px -6px rgba(54, 103, 240, 0.35)"
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        shimmer: { from: { backgroundPosition: "-400px 0" }, to: { backgroundPosition: "400px 0" } }
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.25s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 1.6s infinite linear"
      }
    }
  },
  plugins: []
};

export default config;
