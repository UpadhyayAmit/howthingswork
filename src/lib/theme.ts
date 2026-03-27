export const theme = {
  colors: {
    bg: "#0D0D0D",
    surface: "#161616",
    elevated: "#1E1E1E",
    border: "#2A2A2A",
    accent: "#A855F7",
    accentSecondary: "#C084FC",
    accentGlow: "rgba(168, 85, 247, 0.15)",
    text: "#FFFFFF",
    textMuted: "#A1A1AA",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
  },
} as const;

export type Theme = typeof theme;
