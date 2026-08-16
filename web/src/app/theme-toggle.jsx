"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "designvision:theme:v1";
const THEMES = new Set(["light", "dark"]);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("designvision-theme-change"));
}

function subscribe(onThemeChange) {
  window.addEventListener("designvision-theme-change", onThemeChange);
  return () => window.removeEventListener("designvision-theme-change", onThemeChange);
}

function getThemeSnapshot() {
  const theme = document.documentElement.dataset.theme;
  return THEMES.has(theme) ? theme : "dark";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "dark");

  function selectTheme(nextTheme) {
    if (nextTheme === theme) return;
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The selected appearance still works for this visit if storage is unavailable.
    }
  }

  return (
    <div aria-label="Тема оформления" className="theme-switcher" role="group">
      <button aria-pressed={theme === "light"} className={theme === "light" ? "theme-option active" : "theme-option"} onClick={() => selectTheme("light")} type="button">
        <span aria-hidden="true">☼</span><span>Светлая</span>
      </button>
      <button aria-pressed={theme === "dark"} className={theme === "dark" ? "theme-option active" : "theme-option"} onClick={() => selectTheme("dark")} type="button">
        <span aria-hidden="true">☾</span><span>Тёмная</span>
      </button>
    </div>
  );
}
