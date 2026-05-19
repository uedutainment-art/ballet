import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Next.js scaffold defaults — kept for any auto-generated styles.
        background: "var(--background)",
        foreground: "var(--foreground)",

        // K BALLET brand palette (T1 design system).
        brand: {
          DEFAULT: "#6E7D8A",
          dark: "#5A6975",
        },
        ink: "#2C3E4A",
        gold: "#C4A36B",
        "warm-gray": "#8A8579",
        border: "#E8E3D8",
        cream: {
          start: "#FDF8F3",
          end: "#F4ECDF",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Noto Serif KR", "serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      backgroundImage: {
        cream:
          "linear-gradient(135deg, #FDF8F3 0%, #F4ECDF 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
