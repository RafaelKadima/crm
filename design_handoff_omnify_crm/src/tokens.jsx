// OmniFy Hub — Design tokens (light + dark)
// Two palettes: "conservative" (Pipedrive/Notion-ish) and "bold" (brand-forward).

const OMNIFY_TOKENS = {
  light: {
    // surfaces
    bg:        "#F7F7F5",
    bgSubtle:  "#EFEEEA",
    surface:   "#FFFFFF",
    surfaceAlt:"#FAFAF8",
    border:    "#E6E4DF",
    borderStrong:"#D3D0C9",
    // text
    text:      "#14110F",
    textMuted: "#6B6660",
    textSubtle:"#97928B",
    // accents
    primary:   "#2D5BFF",   // conservadora: azul confiável
    primarySoft:"#E7ECFF",
    success:   "#16A34A",
    successSoft:"#DCFCE7",
    warn:      "#D97706",
    warnSoft:  "#FEF3C7",
    danger:    "#DC2626",
    dangerSoft:"#FEE2E2",
    // bold accent (usado na variação ousada)
    bold:      "#141414",
    boldInk:   "#DCFF00",   // amarelo-verde neon, do vibe "ousado"
    shadow:    "0 1px 2px rgba(20,17,15,0.04), 0 1px 1px rgba(20,17,15,0.03)",
    shadowLg:  "0 8px 24px rgba(20,17,15,0.06), 0 2px 6px rgba(20,17,15,0.04)",
  },
  dark: {
    // Base = um preto levemente quente, mas claramente distinto do sidebar preto puro
    bg:        "#16161A",
    bgSubtle:  "#1D1D22",
    surface:   "#202026",
    surfaceAlt:"#26262C",
    border:    "#2E2E35",
    borderStrong:"#3F3F48",
    text:      "#F4F3EF",
    textMuted: "#A8A5A0",
    textSubtle:"#6E6B66",
    primary:   "#8AA4FF",
    primarySoft:"#232C4A",
    success:   "#5EE08E",
    successSoft:"#143324",
    warn:      "#FBBF24",
    warnSoft:  "#3A2A12",
    danger:    "#FB7185",
    dangerSoft:"#391619",
    // No tema escuro, "bold" (usado na sidebar) precisa ser MAIS escuro que o bg
    // para se diferenciar, e o texto sobre ele claro
    bold:      "#0A0A0C",
    boldInk:   "#DCFF00",
    shadow:    "0 1px 2px rgba(0,0,0,0.5), 0 1px 1px rgba(0,0,0,0.3)",
    shadowLg:  "0 10px 30px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
  },
};

// Helper to resolve tokens by theme
function useOmnifyTokens(theme = "light") {
  return OMNIFY_TOKENS[theme] || OMNIFY_TOKENS.light;
}

// Shared fonts
const OMNIFY_FONTS = {
  sans: `"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
  mono: `"JetBrains Mono", "SF Mono", Menlo, monospace`,
  display: `"Instrument Serif", "Times New Roman", serif`, // para variação ousada
};

Object.assign(window, { OMNIFY_TOKENS, useOmnifyTokens, OMNIFY_FONTS });
