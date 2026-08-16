import Link from "next/link";

type LogoSize = "sm" | "md";

export function LogoMark({ size = "md" }: { size?: LogoSize }) {
  return (
    <span className={`dv-logo-symbol ${size === "sm" ? "dv-logo-symbol-sm" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 36 36" role="presentation">
        <path d="M10 9.5h6.8c6.2 0 9.7 3.2 9.7 8.5s-3.5 8.5-9.7 8.5H10v-17Z" />
        <path d="m15.2 13.1 3.1 8.9 4.7-8.9" />
      </svg>
    </span>
  );
}

export function LogoWithText({ size = "md" }: { size?: LogoSize }) {
  return (
    <Link className={`dv-logo ${size === "sm" ? "dv-logo-sm" : ""}`} href="/" aria-label="DesignVision — на главную">
      <LogoMark size={size} />
      <span className="dv-logo-wordmark">
        <span>DESIGN</span>
        <span className="dv-logo-wordmark-accent">VISION</span>
      </span>
    </Link>
  );
}
