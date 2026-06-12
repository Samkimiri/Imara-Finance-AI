import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        primary: "#13966F",
        "primary-dark": "#0A604B",
        "primary-light": "#E0F6EE",
        blue: "#1E5B9E",
        "blue-light": "#E7F1FC",
        amber: "#A76412",
        "amber-light": "#FFF3D8",
        danger: "#A32D2D",
        "danger-light": "#FCEBEB",
        surface: "#FFFFFF",
        "surface-secondary": "#F4F7F6",
        border: "rgba(15, 23, 42, 0.09)",
        ink: "#0B1714",
        muted: "#647067"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 17, 23, 0.09)"
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
