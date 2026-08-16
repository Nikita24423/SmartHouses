"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
