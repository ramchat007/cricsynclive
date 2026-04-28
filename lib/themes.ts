export const APP_THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export const BROADCAST_THEMES = [
  {
    id: "classic",
    label: "Classic",
    premium: false,
    tokens: {
      accent: "#2dd4bf",
      warning: "#fbbf24",
      danger: "#ef4444",
      success: "#10b981",
      panelBg: "rgba(2,6,23,0.92)",
      panelBorder: "rgba(255,255,255,0.2)",
      text: "#ffffff",
      mutedText: "rgba(255,255,255,0.65)",
    },
  },
  {
    id: "neon",
    label: "Neon",
    premium: false,
    tokens: {
      accent: "#22d3ee",
      warning: "#fde047",
      danger: "#fb7185",
      success: "#4ade80",
      panelBg: "rgba(15,23,42,0.95)",
      panelBorder: "rgba(34,211,238,0.45)",
      text: "#ecfeff",
      mutedText: "rgba(236,254,255,0.7)",
    },
  },
  {
    id: "royal-pro",
    label: "Royal Pro",
    premium: true,
    tokens: {
      accent: "#a78bfa",
      warning: "#f59e0b",
      danger: "#f43f5e",
      success: "#34d399",
      panelBg: "rgba(30,27,75,0.9)",
      panelBorder: "rgba(167,139,250,0.45)",
      text: "#f5f3ff",
      mutedText: "rgba(245,243,255,0.7)",
    },
  },
] as const;

export const getBroadcastTheme = (themeId?: string) =>
  BROADCAST_THEMES.find((theme) => theme.id === themeId) || BROADCAST_THEMES[0];
