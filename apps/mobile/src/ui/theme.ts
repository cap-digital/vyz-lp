// Cores da marca VYZ (mesmos valores do site, globals.css).

import { useColorScheme } from "react-native";

const palette = {
  light: { bg: "#F4F5F0", card: "#FFFFFF", fg: "#1E1E1E", fg2: "#5E6157", line: "#E2E4DC", accent: "#4B5320", accentFg: "#FFFFFF", danger: "#B42318", good: "#2F7D32" },
  dark: { bg: "#1E1E1E", card: "#272826", fg: "#F2F3EE", fg2: "#A7AA9F", line: "#363833", accent: "#A9B86A", accentFg: "#1E1E1E", danger: "#F97066", good: "#7BC47F" },
};

export type Theme = typeof palette.light;

export function useTheme(): Theme {
  return palette[useColorScheme() === "dark" ? "dark" : "light"];
}
