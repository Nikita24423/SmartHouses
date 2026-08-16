import {
  getPaymentOrderByTrackingId,
  markPaymentOrderFailed,
  markPaymentOrderPaid,
} from "@/lib/db";
import {
  extractTrackingId,
  isSuccessfulPayment,
  type BepaidTransactionWebhook,
  verifyWebhookBasicAuth,
  verifyWebhookSignature,
} from "@/lib/payments/bepaid";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const authHeader = req.headers.get("authorization");
  const signature = req.headers.get("content-signature");

  const basicOk = verifyWebhookBasicAuth(authHeader);
  const sigOk = verifyWebhookSignature(rawBody, signature);

  if (!basicOk && !sigOk) {
    console.warn("[payments/webhook] auth failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: BepaidTransactionWebhook;
  try {
    payload = JSON.parse(rawBody) as BepaidTransactionWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackingId = extractTrackingId(payload);
  if (!trackingId) {
    // Expired token without tracking — acknowledge
    if (payload.expired) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "No tracking_id" }, { status: 400 });
  }

  const order = await getPaymentOrderByTrackingId(trackingId);
  if (!order) {
    console.warn("[payments/webhook] unknown order", trackingId);
    return NextResponse.json({ ok: true });
  }

  if (isSuccessfulPayment(payload)) {
    try {
      await markPaymentOrderPaid(trackingId, payload.transaction?.uid ?? null);
    } catch (err) {
      console.error("[payments/webhook] mark paid", err);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.expired || payload.status === "error") {
    await markPaymentOrderFailed(trackingId, "expired");
    return NextResponse.json({ ok: true });
  }

  const status = payload.transaction?.status;
  if (status && status !== "pending" && status !== "incomplete") {
    await markPaymentOrderFailed(trackingId, "failed");
  }

  return NextResponse.json({ ok: true });
}


