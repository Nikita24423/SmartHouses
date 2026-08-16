import { auth } from "@/auth";
import {
  getPaymentOrderByTrackingId,
  getRemainingGenerations,
  getUserByEmail,
  markPaymentOrderPaid,
} from "@/lib/db";
import { queryBepaidCheckout } from "@/lib/payments/bepaid";
import { getPlanById, isSubscriptionActive } from "@/lib/payments/packages";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trackingId = searchParams.get("order");
  if (!trackingId) {
    return NextResponse.json({ error: "Missing order" }, { status: 400 });
  }

  let order = await getPaymentOrderByTrackingId(trackingId);
  if (!order || order.email !== email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (order.status === "pending" && order.bepaid_token) {
    try {
      const remote = await queryBepaidCheckout(order.bepaid_token);
      const ok =
        remote.status === "successful" ||
        remote.status === "paid" ||
        remote.status === "success";
      if (ok) {
        await markPaymentOrderPaid(trackingId, remote.uid ?? null);
        order = (await getPaymentOrderByTrackingId(trackingId)) ?? order;
      }
    } catch (err) {
      console.warn("[payments/status] bePaid query failed", err);
    }
  }

  const user = await getUserByEmail(email);
  const remaining = await getRemainingGenerations(email);
  const plan = getPlanById(order.package_id);
  const active = isSubscriptionActive(
    user?.subscription_plan,
    user?.subscription_expires_at
  );

  return NextResponse.json({
    status: order.status,
    planId: order.package_id,
    planNameKey: plan?.nameKey ?? null,
    expiresAt: user?.subscription_expires_at ?? null,
    subscriptionActive: active,
    remaining,
  });
}


