"use client";

import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

const COPY: Record<Locale, { title: string; subtitle: string; alt: string }> = {
  ru: { title: "Дизайн", subtitle: "по плану", alt: "Дизайн по плану" },
  en: { title: "Design", subtitle: "by Plan", alt: "Design by Plan" },
};

function BrandMark({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      className="brand-mark"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <rect className="brand-mark-plate" height="48" rx="13" width="48" />
      <path
        className="brand-mark-plan"
        d="M11 14.5h17.5v19H14.5V27H11V14.5Z"
        fill="none"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path className="brand-mark-plan" d="M11 27h3.5" fill="none" strokeWidth="1.7" />
      <path className="brand-mark-plan" d="M21 14.5v6.5H28.5" fill="none" strokeWidth="1.5" />
      <rect className="brand-mark-room" height="19" rx="1.5" width="9.5" x="27.5" y="14.5" />
      <path className="brand-mark-window" d="M30.2 18.2h4.2v5.4h-4.2Z" />
      <path
        className="brand-mark-swing"
        d="M14.5 27c3.4 0 6.2 2.8 6.2 6.5"
        fill="none"
        strokeWidth="1.35"
      />
    </svg>
  );
}

export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  const { locale } = useLocale();
  const copy = COPY[locale];

  return (
    <span className={`brand-lockup ${className}`.trim()} role="img" aria-label={copy.alt}>
      <BrandMark size={height} />
    </span>
  );
}

export function LogoWithText({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const mark = { sm: 32, md: 40, lg: 48 }[size];

  return (
    <span className={`brand-lockup brand-lockup-${size} ${className}`.trim()} aria-label={copy.alt}>
      <BrandMark size={mark} />
      <span className="brand-wordmark">
        <span className="brand-title">{copy.title}</span>
        <span className="brand-subtitle">{copy.subtitle}</span>
      </span>
    </span>
  );
}
