/**
 * useTheme() — the ONLY way components should get colors.
 *
 * Wraps useColorScheme() and returns the correct token set
 * for the current light/dark mode.
 */

import { useColorScheme } from "react-native";
import { lightColors, darkColors, type ThemeColors } from "@/constants/theme";

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return { colors: isDark ? darkColors : lightColors, isDark };
}
