"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDictionary, t, type Dictionary, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "designvision-locale";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  tr: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ru";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "ru";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const tr = useCallback(
    (key: string, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, dict, setLocale, tr }),
    [locale, dict, setLocale, tr]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}


