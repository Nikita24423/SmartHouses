import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { getPlanById } from "@/lib/payments/packages";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL не задан. Подключите Neon Postgres в Vercel.");
  }
  return neon(url);
}

async function ensureSchema(): Promise<void> {
  // Schema changes are applied by versioned SQL migrations, never during requests.
}

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  generations_used: number;
  generations_limit: number | null;
  credits_balance: number;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
}

export async function upsertUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<UserRecord> {
  await ensureSchema();
  const sql = getSql();

  const existing = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    const row = existing[0] as UserRecord;
    await sql`
      UPDATE users
      SET name = ${name ?? row.name}, image = ${image ?? row.image}
      WHERE email = ${email}
    `;
    const updated = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return updated[0] as UserRecord;
  }

  const id = uuidv4();
  await sql`
    INSERT INTO users (id, email, name, image)
    VALUES (${id}, ${email}, ${name ?? null}, ${image ?? null})
  `;
  const created = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return created[0] as UserRecord;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] as UserRecord | undefined;
}

export function getDefaultGenerationLimit(): number {
  return parseInt(process.env.GENERATION_LIMIT ?? "5", 10);
}

/** @deprecated use getGenerationLimitForUser */
export function getGenerationLimit(): number {
  return getDefaultGenerationLimit();
}

export function getGenerationLimitForUser(user?: UserRecord | null): number {
  if (user?.credits_balance != null) {
    return Math.max(0, user.generations_used) + Math.max(0, user.credits_balance);
  }
  if (user?.generations_limit != null && user.generations_limit > 0) {
    return user.generations_limit;
  }
  return getDefaultGenerationLimit();
}

export async function getRemainingGenerations(email: string): Promise<number> {
  const user = await getUserByEmail(email);
  if (!user) return getDefaultGenerationLimit();
  return Math.max(0, user.credits_balance);
}

export async function setUserGenerationLimit(
  email: string,
  limit: number
): Promise<UserRecord> {
  await ensureSchema();
  const sql = getSql();
  const existing = await getUserByEmail(email);

  if (existing) {
    await sql`
      UPDATE users
      SET generations_limit = ${limit},
          credits_balance = GREATEST(${limit} - generations_used, 0)
      WHERE email = ${email}
    `;
  } else {
    await sql`
      INSERT INTO users (id, email, generations_limit, credits_balance)
      VALUES (${uuidv4()}, ${email}, ${limit}, ${limit})
    `;
  }

  const user = await getUserByEmail(email);
  if (!user) throw new Error("Не удалось обновить лимит пользователя");
  return user;
}

export async function incrementGenerations(
  userId: string,
  prompt: string,
  styleId: string
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE users
    SET generations_used = generations_used + 1,
        credits_balance = GREATEST(credits_balance - 1, 0)
    WHERE id = ${userId}
  `;
  await sql`
    INSERT INTO generations (id, user_id, prompt, style_id)
    VALUES (${uuidv4()}, ${userId}, ${prompt}, ${styleId})
  `;
}

export type PaymentOrderStatus = "pending" | "paid" | "failed" | "expired";

export interface PaymentOrder {
  id: string;
  user_id: string;
  email: string;
  package_id: string;
  credits: number;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  tracking_id: string;
  bepaid_token: string | null;
  bepaid_uid: string | null;
  created_at: string;
  paid_at: string | null;
}

export async function createPaymentOrder(input: {
  userId: string;
  email: string;
  packageId: string;
  credits: number;
  amount: number;
  currency: string;
  trackingId: string;
}): Promise<PaymentOrder> {
  await ensureSchema();
  const sql = getSql();
  const id = uuidv4();
  await sql`
    INSERT INTO payment_orders (
      id, user_id, email, package_id, credits, amount, currency, status, tracking_id
    ) VALUES (
      ${id},
      ${input.userId},
      ${input.email},
      ${input.packageId},
      ${input.credits},
      ${input.amount},
      ${input.currency},
      'pending',
      ${input.trackingId}
    )
  `;
  const rows = await sql`SELECT * FROM payment_orders WHERE id = ${id} LIMIT 1`;
  return rows[0] as PaymentOrder;
}

export async function setPaymentOrderToken(
  trackingId: string,
  token: string
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE payment_orders SET bepaid_token = ${token}
    WHERE tracking_id = ${trackingId}
  `;
}

export async function getPaymentOrderByTrackingId(
  trackingId: string
): Promise<PaymentOrder | undefined> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM payment_orders WHERE tracking_id = ${trackingId} LIMIT 1
  `;
  return rows[0] as PaymentOrder | undefined;
}

/** Activate / extend monthly subscription from a paid order (idempotent). */
export async function markPaymentOrderPaid(
  trackingId: string,
  bepaidUid?: string | null
): Promise<{
  order: PaymentOrder;
  alreadyPaid: boolean;
  remaining: number;
  planId: string;
  expiresAt: string | null;
}> {
  await ensureSchema();
  const sql = getSql();
  const order = await getPaymentOrderByTrackingId(trackingId);
  if (!order) {
    throw new Error("Order not found");
  }

  const user = await getUserByEmail(order.email);
  if (order.status === "paid") {
    const remaining = await getRemainingGenerations(order.email);
    return {
      order,
      alreadyPaid: true,
      remaining,
      planId: user?.subscription_plan ?? order.package_id,
      expiresAt: user?.subscription_expires_at ?? null,
    };
  }

  const plan = getPlanById(order.package_id);
  const periodDays = plan?.periodDays ?? 30;
  const creditsToAdd = order.credits > 0 ? order.credits : plan?.credits ?? 100;
  const claimed = await sql`
    WITH paid_order AS (
      UPDATE payment_orders
      SET status = 'paid',
          paid_at = NOW(),
          bepaid_uid = ${bepaidUid ?? null}
      WHERE tracking_id = ${trackingId} AND status <> 'paid'
      RETURNING *
    ), updated_user AS (
      UPDATE users AS app_user
      SET subscription_plan = paid_order.package_id,
          subscription_expires_at =
            GREATEST(
              COALESCE(app_user.subscription_expires_at, NOW()),
              NOW()
            ) + (${periodDays} * INTERVAL '1 day'),
          credits_balance = app_user.credits_balance + ${creditsToAdd},
          generations_limit =
            COALESCE(app_user.generations_used, 0) +
            app_user.credits_balance + ${creditsToAdd}
      FROM paid_order
      WHERE app_user.id = paid_order.user_id
      RETURNING app_user.subscription_expires_at
    )
    SELECT paid_order.*, updated_user.subscription_expires_at AS activated_until
    FROM paid_order CROSS JOIN updated_user
  `;

  if (claimed.length === 0) {
    const alreadyUpdated = await getPaymentOrderByTrackingId(trackingId);
    if (!alreadyUpdated) throw new Error("Order missing after payment claim");
    const currentUser = await getUserByEmail(order.email);
    return {
      order: alreadyUpdated,
      alreadyPaid: true,
      remaining: await getRemainingGenerations(order.email),
      planId: currentUser?.subscription_plan ?? alreadyUpdated.package_id,
      expiresAt: currentUser?.subscription_expires_at ?? null,
    };
  }

  const updated = claimed[0] as PaymentOrder & { activated_until: string };
  const remaining = await getRemainingGenerations(order.email);
  return {
    order: updated,
    alreadyPaid: false,
    remaining,
    planId: order.package_id,
    expiresAt: updated.activated_until,
  };
}

export async function markPaymentOrderFailed(
  trackingId: string,
  status: "failed" | "expired" = "failed"
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE payment_orders
    SET status = ${status}
    WHERE tracking_id = ${trackingId} AND status = 'pending'
  `;
}

