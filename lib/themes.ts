import { Sun, Moon, Droplets, Sunrise } from "lucide-react";
export const APP_THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "ocean", label: "Ocean", icon: Droplets },
  { id: "sunset", label: "Sunset", icon: Sunrise },
] as const;
// Comprehensive theme color palette
export const THEME_COLORS = {
  light: {
    background: "#ffffff",
    foreground: "#171717",
    surface1: "#ffffff",
    surface2: "#f8fafc",
    border1: "#e2e8f0",
    textMuted: "#64748b",
    textSecondary: "#64748b",
    accent: "#2dd4bf",
    accentHover: "#14b8a6",
    warning: "#fbbf24",
    danger: "#ef4444",
    success: "#10b981",
    navbar: "#ffffff",
    navbarText: "#171717",
    navbarBorder: "#e2e8f0",
  },
  dark: {
    background: "#020617",
    foreground: "#e2e8f0",
    surface1: "#0f172a",
    surface2: "#111827",
    border1: "#1f2937",
    textMuted: "#94a3b8",
    textSecondary: "#94a3b8",
    accent: "#2dd4bf",
    accentHover: "#14b8a6",
    warning: "#fbbf24",
    danger: "#ef4444",
    success: "#10b981",
    navbar: "#0f172a",
    navbarText: "#e2e8f0",
    navbarBorder: "#1f2937",
  },
  ocean: {
    background: "#ecfeff",
    foreground: "#0f172a",
    surface1: "#cffafe",
    surface2: "#a5f3fc",
    border1: "#67e8f9",
    textMuted: "#155e75",
    textSecondary: "#155e75",
    accent: "#22d3ee",
    accentHover: "#06b6d4",
    warning: "#f59e0b",
    danger: "#ef4444",
    success: "#10b981",
    navbar: "#cffafe",
    navbarText: "#0f172a",
    navbarBorder: "#67e8f9",
  },
  sunset: {
    background: "#fff7ed",
    foreground: "#431407",
    surface1: "#ffedd5",
    surface2: "#fed7aa",
    border1: "#fdba74",
    textMuted: "#9a3412",
    textSecondary: "#9a3412",
    accent: "#f97316",
    accentHover: "#ea580c",
    warning: "#f59e0b",
    danger: "#ef4444",
    success: "#10b981",
    navbar: "#ffedd5",
    navbarText: "#431407",
    navbarBorder: "#fdba74",
  },
} as const;

export type ThemeId = (typeof APP_THEMES)[number]["id"];
export type ThemeColors = {
  [K in keyof typeof THEME_COLORS.light]: string;
};
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

export const getThemeColors = (themeId?: string): ThemeColors => {
  const id = (themeId || "light") as ThemeId;
  return THEME_COLORS[id] || THEME_COLORS.light;
};
