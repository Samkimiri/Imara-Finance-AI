import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        primary: "#4B6F00",
        "primary-dark": "#263900",
        "primary-light": "#ECFFD8",
        blue: "#10243A",
        "blue-light": "#E6EEF7",
        amber: "#D95F00",
        "amber-light": "#FFF0E4",
        danger: "#B91C1C",
        "danger-light": "#FFE8E8",
        surface: "#FFFFFF",
        "surface-secondary": "#F7FAF0",
        border: "rgba(7, 17, 31, 0.11)",
        ink: "#07111F",
        muted: "#617065"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(7, 17, 31, 0.11)"
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        panel: "16px"
      }
    }
  },
  plugins: []
} satisfies Config;
