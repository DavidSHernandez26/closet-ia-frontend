/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // No resetear estilos base para no romper el CSS existente
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        purple: {
          deep:    "#08011a",
          DEFAULT: "#0F0326",
          accent:  "#1a0a40",
          light:   "#C4B5E8",
        },
        sage:  "#84A07C",
        cream: "#F4F4F9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "4px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,181,232,0.08), inset 0 1px 0 rgba(196,181,232,0.1)",
        "glass-sm":
          "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(196,181,232,0.08)",
        lilac:
          "0 0 0 1px rgba(196,181,232,0.12), 0 4px 12px rgba(196,181,232,0.1)",
      },
      backgroundImage: {
        "glass-dark":
          "linear-gradient(180deg, rgba(20,8,52,0.82), rgba(15,3,38,0.78))",
        "glass-sage":
          "linear-gradient(180deg, rgba(132,160,124,0.85), rgba(132,160,124,0.7))",
        "lilac-subtle":
          "linear-gradient(180deg, rgba(196,181,232,0.18), rgba(196,181,232,0.08))",
      },
      animation: {
        "fade-in":    "fadeIn 0.22s ease forwards",
        "slide-up":   "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "dot-pulse":  "dotPulse 1.4s ease-in-out infinite",
        shimmer:      "shimmer 1.6s infinite linear",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        dotPulse: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%":           { transform: "scale(1)",   opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
