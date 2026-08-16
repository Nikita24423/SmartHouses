"use client";

import Link from "next/link";

export function LogoWithText({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Link className={`dv-logo ${size === "sm" ? "dv-logo-sm" : ""}`} href="/" aria-label="DesignVision">
      <span className="dv-logo-mark" aria-hidden="true">DV</span>
      <span>DESIGNVISION</span>
    </Link>
  );
}
