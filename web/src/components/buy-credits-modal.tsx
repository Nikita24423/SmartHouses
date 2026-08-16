"use client";

import { useState } from "react";
import {
  SUBSCRIPTION_PLANS,
  formatMoney,
  formatPeriodLabel,
  type AppMode,
} from "@/lib/payments/packages";

const MODE_LABEL_KEYS: Record<AppMode, string> = {
  standard: "app.modeStandard",
  techpassport: "app.modeTechPassport",
  house3d: "app.modeHouse3d",
};

export function BuyCreditsModal({
  open,
  onClose,
  currency,
  locale,
  currentPlanId,
  tr,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  locale: string;
  currentPlanId?: string | null;
  tr: (key: string, params?: Record<string, string | number>) => string;
  labels: {
    title: string;
    subtitle: string;
    buy: string;
    close: string;
    loading: string;
    error: string;
    perMonth: string;
    current: string;
    modes: string;
    generationsIncluded: string;
  };
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function startCheckout(planId: string) {
    setError(null);
    setBusyId(planId);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error ?? labels.error);
      }
      window.location.assign(data.redirectUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={labels.close}
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{labels.title}</h2>
            <p className="mt-1 text-sm text-muted">{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground"
            aria-label={labels.close}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border px-4 py-3 ${
                  isCurrent
                    ? "border-accent bg-accent-soft/40"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {tr(plan.nameKey)}
                      </p>
                      {isCurrent && (
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {labels.current}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">{tr(plan.descKey)}</p>
                    <p className="mt-2 text-[11px] font-medium text-muted">
                      {labels.modes}:{" "}
                      {plan.modes.map((m) => tr(MODE_LABEL_KEYS[m])).join(" · ")}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-accent">
                      {labels.generationsIncluded.replace(
                        "{count}",
                        String(plan.credits)
                      )}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatMoney(plan.amount, currency)}{" "}
                      <span className="text-xs font-normal text-muted">
                        {labels.perMonth || formatPeriodLabel(locale)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => startCheckout(plan.id)}
                    className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busyId === plan.id ? labels.loading : labels.buy}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}

