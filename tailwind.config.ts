import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        mist: "#151515",
        brand: "#facc15",
        coral: "#ef4444",
        gold: "#facc15"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
