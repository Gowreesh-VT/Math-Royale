import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // These MUST match the variable names in your layout.tsx
        display: ["var(--font-geist-sans)", "sans-serif"],
        ui: ["var(--font-geist-mono)", "monospace"],
      },
      // Adding custom font weights ensures Tailwind generates the classes
      fontWeight: {
        extrabold: '800',
        black: '900',
      },
    },
  },
  plugins: [],
};

export default config;