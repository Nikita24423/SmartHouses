"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { LogoWithText } from "@/components/logo";
import { getPlanById } from "@/lib/payments/packages";

function PaymentSuccessInner() {
  const { tr, locale } = useLocale();
  const { update } = useSession();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">(
    () => orderId ? "loading" : "error"
  );
  const [planLabel, setPlanLabel] = useState("");
  const [expiresLabel, setExpiresLabel] = useState("");
  const [creditsAdded, setCreditsAdded] = useState(100);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const res = await fetch(
          `/api/payments/status?order=${encodeURIComponent(orderId!)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        if (data.status === "paid") {
          const plan = getPlanById(data.planId);
          setPlanLabel(plan ? tr(plan.nameKey) : data.planId);
          setCreditsAdded(plan?.credits ?? 100);
          if (data.expiresAt) {
            setExpiresLabel(
              new Date(data.expiresAt).toLocaleDateString(
                locale === "en" ? "en-GB" : "ru-RU"
              )
            );
          }
          setStatus("paid");
          await update();
          return;
        }
        attempts += 1;
        if (attempts < 8) {
          setStatus("pending");
          setTimeout(poll, 1500);
        } else {
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, update, tr, locale]);

  return (
    <div className="mt-8 w-full max-w-md text-center">
      {status === "loading" && (
        <p className="text-muted">{tr("payment.checking")}</p>
      )}
      {status === "paid" && (
        <>
          <h1 className="text-2xl font-semibold">{tr("payment.successTitle")}</h1>
          <p className="mt-3 text-muted">
            {tr("payment.successBody", {
              plan: planLabel,
              expires: expiresLabel,
              credits: String(creditsAdded),
            })}
          </p>
        </>
      )}
      {status === "pending" && (
        <>
          <h1 className="text-2xl font-semibold">{tr("payment.pendingTitle")}</h1>
          <p className="mt-3 text-muted">{tr("payment.pendingBody")}</p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-semibold">{tr("payment.errorTitle")}</h1>
          <p className="mt-3 text-muted">{tr("payment.errorBody")}</p>
        </>
      )}
      <Link
        href="/app"
        className="mt-8 inline-flex rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        {tr("payment.backToApp")}
      </Link>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-foreground">
      <LogoWithText size="md" />
      <Suspense fallback={<p className="mt-8 text-muted">…</p>}>
        <PaymentSuccessInner />
      </Suspense>
    </div>
  );
}

