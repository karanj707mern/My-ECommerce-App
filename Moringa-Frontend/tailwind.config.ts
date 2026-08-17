import type { Config } from "tailwindcss";

const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        neon: {
          DEFAULT: "#22d3ee",
          dim: "rgba(34, 211, 238, 0.25)",
          glow: "rgba(34, 211, 238, 0.45)",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)",
        "card-hover":
          "0 0 0 1px rgba(34, 211, 238, 0.35), 0 8px 24px rgba(34, 211, 238, 0.18), 0 2px 8px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
