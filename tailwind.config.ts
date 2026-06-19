import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7C3AED",
          dark: "#5B21B6",
          light: "#A78BFA",
        },
      },
    },
  },
  plugins: [],
}

export default config