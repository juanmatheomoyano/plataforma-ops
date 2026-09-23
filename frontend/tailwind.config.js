/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Encode Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        display: [
          "Plus Jakarta Sans",
          "Encode Sans",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          active: "hsl(var(--sidebar-active))",
          "active-foreground": "hsl(var(--sidebar-active-foreground))",
          muted: "hsl(var(--sidebar-muted))",
        },
        // Marca — tokens crudos para logo, ilustraciones y acentos hero
        brand: {
          cyan: "#0AA0DC",
          "cyan-light": "#3EC0F0",
          green: "#1F9E48",
          "green-light": "#26B554",
          lime: "#B9D400",
          ink: "#0B2230",
          "ink-2": "#142C3D",
          "ink-3": "#22384A",
          bg: "#F6F9FB",
          mist: "#E4EBF1",
          slate: "#5B7383",
          "slate-light": "#B8C8D3",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        soft: "0 12px 32px -12px rgba(11, 34, 48, 0.12)",
        card: "0 1px 2px rgba(11,34,48,0.04), 0 12px 32px -18px rgba(11,34,48,0.18)",
        "brand-glow":
          "0 0 0 1px rgba(10,160,220,0.35), 0 20px 40px -18px rgba(10,160,220,0.55)",
      },
      letterSpacing: {
        tightest: "-0.035em",
        mono: "0.22em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
