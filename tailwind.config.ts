import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        adv: {
          sidebar: "var(--adv-sidebar)",
          main: "var(--adv-main)",
          surface: "var(--adv-surface)",
          surfaceHover: "var(--adv-surface-hover)",
          border: "var(--adv-border)",
          text: "var(--adv-text)",
          secondary: "var(--adv-secondary)",
          accent: "var(--adv-accent)",
          accentHover: "var(--adv-accent-hover)",
          success: "var(--adv-success)",
          successBg: "var(--adv-success-bg)",
          warning: "var(--adv-warning)",
          warningBg: "var(--adv-warning-bg)",
          danger: "var(--adv-danger)",
          dangerBg: "var(--adv-danger-bg)",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Noto Sans JP",
          "Noto Sans Telugu",
          "Noto Sans Kannada",
          "Noto Sans Devanagari",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
