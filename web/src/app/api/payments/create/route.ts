import { auth } from "@/auth";
import {
  createPaymentOrder,
  getUserByEmail,
  setPaymentOrderToken,
} from "@/lib/db";
import {
  createBepaidCheckout,
  getPaymentCurrency,
} from "@/lib/payments/bepaid";
import { getPlanById } from "@/lib/payments/packages";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

function appBaseUrl(req: Request): string {
  const envUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    packageId?: string;
    planId?: string;
    locale?: string;
  };
  const planId = body.planId ?? body.packageId;
  const plan = planId ? getPlanById(planId) : undefined;
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const trackingId = `dv_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
  const currency = getPaymentCurrency();
  const locale = body.locale === "en" ? "en" : "ru";
  const base = appBaseUrl(req);

  await createPaymentOrder({
    userId: user.id,
    email,
    packageId: plan.id,
    credits: plan.credits,
    amount: plan.amount,
    currency,
    trackingId,
  });

  const planNames: Record<string, { ru: string; en: string }> = {
    sub_standard: { ru: "Стандарт", en: "Standard" },
    sub_plan: { ru: "По плану", en: "By Plan" },
    sub_full: { ru: "Максимум", en: "Full Access" },
  };
  const label = planNames[plan.id]?.[locale] ?? plan.id;
  const description =
    locale === "en"
      ? `Subscription «${label}» — 1 month — Design by Plan`
      : `Подписка «${label}» — 1 месяц — Дизайн по Плану`;

  try {
    const checkout = await createBepaidCheckout({
      pkg: plan,
      trackingId,
      email,
      description,
      language: locale,
      successUrl: `${base}/app/payment/success?order=${encodeURIComponent(trackingId)}`,
      failUrl: `${base}/app/payment/fail?order=${encodeURIComponent(trackingId)}`,
      declineUrl: `${base}/app/payment/fail?order=${encodeURIComponent(trackingId)}`,
      cancelUrl: `${base}/app/payment/fail?order=${encodeURIComponent(trackingId)}&cancel=1`,
      notificationUrl: `${base}/api/payments/webhook`,
    });

    await setPaymentOrderToken(trackingId, checkout.token);

    return NextResponse.json({
      redirectUrl: checkout.redirectUrl,
      trackingId,
      token: checkout.token,
    });
  } catch (err) {
    console.error("[payments/create]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Не удалось создать платёж",
      },
      { status: 502 }
    );
  }
}


