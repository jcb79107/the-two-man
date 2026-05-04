import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        sand: "#f3ead7",
        pine: "#133b2c",
        fairway: "#1f6b4f",
        gold: "#d9b86c",
        ink: "#112017",
        mist: "#dce7df"
      },
      boxShadow: {
        card: "0 18px 50px rgba(17, 32, 23, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
