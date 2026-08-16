"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "designvision:theme:v1";
const CHANGE_EVENT = "designvision-theme-change";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Appearance still changes for the current visit when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, (): Theme => "dark");
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark"),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
