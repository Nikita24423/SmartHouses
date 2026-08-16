"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { LogoWithText } from "@/components/logo";

function PaymentFailInner() {
  const { tr } = useLocale();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancel") === "1";

  return (
    <div className="mt-8 w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold">
        {cancelled ? tr("payment.cancelTitle") : tr("payment.failTitle")}
      </h1>
      <p className="mt-3 text-muted">
        {cancelled ? tr("payment.cancelBody") : tr("payment.failBody")}
      </p>
      <Link
        href="/app"
        className="mt-8 inline-flex rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        {tr("payment.backToApp")}
      </Link>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-foreground">
      <LogoWithText size="md" />
      <Suspense fallback={<p className="mt-8 text-muted">…</p>}>
        <PaymentFailInner />
      </Suspense>
    </div>
  );
}


