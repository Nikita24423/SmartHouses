import { createVerify } from "crypto";
import type { SubscriptionPlan } from "./packages";

export type BepaidCredentials = {
  shopId: string;
  secretKey: string;
  publicKey: string;
  checkoutUrl: string;
  gatewayHost: string;
};

export function getBepaidCredentials(): BepaidCredentials {
  const shopId = process.env.BEPAID_SHOP_ID?.trim();
  const secretKey = process.env.BEPAID_SECRET_KEY?.trim();
  const publicKey = process.env.BEPAID_PUBLIC_KEY?.replace(/\s+/g, "").trim();

  if (!shopId || !secretKey || !publicKey) {
    throw new Error(
      "bePaid не настроен: задайте BEPAID_SHOP_ID, BEPAID_SECRET_KEY и BEPAID_PUBLIC_KEY"
    );
  }

  const checkoutUrl = (
    process.env.BEPAID_CHECKOUT_URL ?? "https://checkout.bepaid.by"
  ).replace(/\/$/, "");

  return {
    shopId,
    secretKey,
    publicKey,
    checkoutUrl,
    gatewayHost: checkoutUrl.includes("begateway")
      ? "checkout.begateway.com"
      : "checkout.bepaid.by",
  };
}

export function getPaymentCurrency(): string {
  return (process.env.BEPAID_CURRENCY ?? "USD").toUpperCase();
}

export function isBepaidTestMode(): boolean {
  return (process.env.BEPAID_TEST ?? "true").toLowerCase() !== "false";
}

function basicAuthHeader(shopId: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

export type CreateCheckoutParams = {
  pkg: Pick<SubscriptionPlan, "amount">;
  trackingId: string;
  email: string;
  description: string;
  language: "ru" | "en";
  successUrl: string;
  failUrl: string;
  declineUrl: string;
  cancelUrl: string;
  notificationUrl: string;
};

export type CreateCheckoutResult = {
  token: string;
  redirectUrl: string;
};

export async function queryBepaidCheckout(token: string): Promise<{
  status?: string;
  trackingId?: string | null;
  uid?: string | null;
  finished?: boolean;
}> {
  const creds = getBepaidCredentials();
  const res = await fetch(
    `${creds.checkoutUrl}/ctp/api/checkouts/${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        Authorization: basicAuthHeader(creds.shopId, creds.secretKey),
        Accept: "application/json",
        "X-API-Version": "2",
      },
    }
  );
  if (!res.ok) return {};
  const data = (await res.json().catch(() => ({}))) as {
    checkout?: {
      status?: string;
      finished?: boolean;
      order?: { tracking_id?: string | null };
      gateway_response?: { payment?: { uid?: string; status?: string } };
      transaction?: { uid?: string; status?: string };
    };
  };
  const checkout = data.checkout;
  return {
    status:
      checkout?.status ??
      checkout?.transaction?.status ??
      checkout?.gateway_response?.payment?.status,
    trackingId: checkout?.order?.tracking_id,
    uid:
      checkout?.transaction?.uid ??
      checkout?.gateway_response?.payment?.uid ??
      null,
    finished: checkout?.finished,
  };
}

export async function createBepaidCheckout(
  params: CreateCheckoutParams
): Promise<CreateCheckoutResult> {
  const creds = getBepaidCredentials();
  const currency = getPaymentCurrency();
  const test = isBepaidTestMode();

  const body = {
    checkout: {
      test,
      transaction_type: "payment",
      attempts: 3,
      settings: {
        success_url: params.successUrl,
        fail_url: params.failUrl,
        decline_url: params.declineUrl,
        cancel_url: params.cancelUrl,
        notification_url: params.notificationUrl,
        language: params.language,
      },
      order: {
        currency,
        amount: params.pkg.amount,
        description: params.description,
        tracking_id: params.trackingId,
      },
      customer: {
        email: params.email,
      },
    },
  };

  const res = await fetch(`${creds.checkoutUrl}/ctp/api/checkouts`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(creds.shopId, creds.secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Version": "2",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    checkout?: { token?: string; redirect_url?: string };
    message?: string;
    response?: { message?: string };
  };

  if (!res.ok || !data.checkout?.token || !data.checkout?.redirect_url) {
    const msg =
      data.message ??
      data.response?.message ??
      `bePaid error HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    token: data.checkout.token,
    redirectUrl: data.checkout.redirect_url,
  };
}

/** Verify webhook Basic Auth from bePaid. */
export function verifyWebhookBasicAuth(
  authorizationHeader: string | null
): boolean {
  if (!authorizationHeader?.startsWith("Basic ")) return false;
  const creds = getBepaidCredentials();
  const expected = basicAuthHeader(creds.shopId, creds.secretKey);
  return authorizationHeader === expected;
}

/** Optional Content-Signature verification (RSA SHA256). */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  try {
    const creds = getBepaidCredentials();
    const pem = `-----BEGIN PUBLIC KEY-----\n${creds.publicKey
      .replace(/\s+/g, "")
      .match(/.{1,64}/g)
      ?.join("\n")}\n-----END PUBLIC KEY-----`;
    const verify = createVerify("RSA-SHA256");
    verify.update(rawBody);
    verify.end();
    return verify.verify(pem, Buffer.from(signatureHeader, "base64"));
  } catch {
    return false;
  }
}

export type BepaidTransactionWebhook = {
  transaction?: {
    uid?: string;
    status?: string;
    amount?: number;
    currency?: string;
    tracking_id?: string;
    test?: boolean;
    message?: string;
  };
  status?: string;
  token?: string;
  expired?: boolean;
  order?: { tracking_id?: string | null };
};

export function extractTrackingId(payload: BepaidTransactionWebhook): string | null {
  return (
    payload.transaction?.tracking_id ??
    payload.order?.tracking_id ??
    null
  );
}

export function isSuccessfulPayment(payload: BepaidTransactionWebhook): boolean {
  return payload.transaction?.status === "successful";
}


