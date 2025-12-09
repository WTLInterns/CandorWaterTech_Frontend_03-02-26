import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neo: {
          sidebarTop: "#0A0F24",
          sidebarBottom: "#11182E",
          pageBg: "#0E1424",
          cardBg: "#161E30",
          primary: "#4C6FFF",
          primaryHover: "#355BFF",
          secondary: "#1EB8FF",
          textPrimary: "#FFFFFF",
          textSecondary: "#A4B0C0",
          textMuted: "#667085",
          border: "#1F2940",
        },
      },
    },
  },
  plugins: [],
};

export default config;
