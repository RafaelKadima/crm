/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OmniFy Bold Palette — warm bege + charcoal + neon lime
        omni: {
          // Bege canvas
          bg: '#F7F7F5',
          bgSubtle: '#EFEEEA',
          surface: '#FFFFFF',
          ink: '#14110F',
          muted: '#6B6660',
          subtle: '#97928B',
          borderWarm: '#E6E4DF',
          borderStrong: '#D3D0C9',
          // Bold / signature
          bold: '#141414',
          boldDark: '#0A0A0C',
          boldInk: '#DCFF00',
          // Legacy monochrome (kept for backwards compat — some components still reference)
          white: '#FFFFFF',
          silver: '#C0C8D4',
          steel: '#8892A0',
          slate: '#4A5568',
          charcoal: '#2D3748',
          graphite: '#1A202C',
          obsidian: '#0D1117',
          cyan: '#00D4FF',
          green: '#10B981',
          orange: '#F59E0B',
          red: '#EF4444',
        },
        // Semantic tokens bound to CSS variables
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--color-popover)",
          foreground: "var(--color-popover-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          foreground: "var(--color-sidebar-foreground)",
          accent: "var(--color-sidebar-accent)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-foreground)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          foreground: "var(--color-info-foreground)",
        },
        bold: {
          DEFAULT: "var(--color-bold)",
          foreground: "var(--color-bold-foreground)",
          ink: "var(--color-bold-ink)",
        },
        warm: {
          DEFAULT: "var(--color-warm)",
          subtle: "var(--color-warm-subtle)",
          ink: "var(--color-warm-ink)",
          muted: "var(--color-warm-muted)",
          border: "var(--color-warm-border)",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg, 14px)",
        md: "var(--radius-md, 10px)",
        sm: "var(--radius-sm, 8px)",
      },
      fontFamily: {
        sans: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.035em',
        eyebrow: '0.14em',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "stagger-rise": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "stagger-rise": "stagger-rise 0.55s cubic-bezier(0.21, 0.87, 0.35, 1) both",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
