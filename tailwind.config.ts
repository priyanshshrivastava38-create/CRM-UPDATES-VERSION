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
          50: "#eef5ff",
          100: "#dfeafc",
          200: "#bfd5ff",
          300: "#8fb1ff",
          400: "#5b87f6",
          500: "#3563d9",
          600: "#264bb3",
          700: "#1d3d8a",
          800: "#1b2e63",
          900: "#172849"
        }
      },
      boxShadow: {
        soft: "0 22px 60px -18px rgba(15, 23, 42, 0.18)",
        card: "0 1px 0 rgba(15, 23, 42, 0.04), 0 10px 24px -18px rgba(15, 23, 42, 0.18)",
        "card-hover": "0 1px 0 rgba(15, 23, 42, 0.05), 0 18px 34px -20px rgba(15, 23, 42, 0.22)",
        glow: "0 0 0 1px rgba(53, 99, 217, 0.12), 0 10px 26px -12px rgba(53, 99, 217, 0.32)"
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
