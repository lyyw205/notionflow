import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9dffe",
          300: "#7cc5fd",
          400: "#36a9fa",
          500: "#0c8eeb",
          600: "#0070c9",
          700: "#0059a3",
          800: "#054b86",
          900: "#0a3f6f",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
