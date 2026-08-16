"use client";

import { useLocale } from "@/components/locale-provider";
import { useTheme } from "@/components/theme-provider";
import type { Locale } from "@/lib/i18n";

const LOGOS: Record<Locale, Record<"dark" | "light", string>> = {
  ru: { dark: "/logo-light.jpg", light: "/logo-dark.png" },
  en: { dark: "/logo-en-dark.png", light: "/logo-en-light.png" },
};

const ALT: Record<Locale, string> = {
  ru: "Дизайн по Плану",
  en: "Design by Plan",
};

export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  const { theme } = useTheme();
  const { locale } = useLocale();

  return (
    // The source images retain their original logo artwork; only their empty canvas was removed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGOS[locale][theme]}
      alt={ALT[locale]}
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height }}
    />
  );
}

export function LogoWithText({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const heights = { sm: 32, md: 40, lg: 48 };

  return (
    <div className={`flex min-w-0 shrink-0 items-center ${className}`}>
      <Logo height={heights[size]} className="max-w-[min(100%,14rem)] sm:max-w-[18rem]" />
    </div>
  );
}
