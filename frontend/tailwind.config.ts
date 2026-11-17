import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF2F4',
          100: '#FBE6EA',
          200: '#F6C2CC',
          500: '#92001E', // Main Crimson Maroon
          600: '#7E001A',
          700: '#6B0016',
          800: '#580012',
          900: '#45000E',
          950: '#650015', // Dark Maroon for Sidebar
        },
        ivory: {
          50: '#FEF7EC',  // Main Page Background
          100: '#FFF6EC', // Secondary background
          200: '#EAD8C7', // Neutral Borders
          300: '#DFD0C0',
        },
        darkcard: '#1A1918', // High-contrast black KPI card
        charcoal: {
          DEFAULT: '#2B2523',
          muted: '#736F6C',
        }
      },
    },
  },
  plugins: [],
};

export default config;
