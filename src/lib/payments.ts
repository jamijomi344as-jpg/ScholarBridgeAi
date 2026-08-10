import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions, studentProfiles } from "@/db/schema";

export const PREMIUM_PRICE_UZS = 59000;
export const PREMIUM_CURRENCY = "UZS";
export const PREMIUM_PERIOD_DAYS = 30;

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------
export function paymeConfig() {
  return {
    merchantId: process.env.PAYME_MERCHANT_ID || "demo-payme-merchant",
    key: process.env.PAYME_KEY || "",
    password: process.env.PAYME_PASSWORD || "",
  };
}

export function clickConfig() {
  return {
    serviceId: process.env.CLICK_SERVICE_ID || "demo-click-service",
    merchantId: process.env.CLICK_MERCHANT_ID || "demo-click-merchant",
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID || "demo-click-user",
    secretKey: process.env.CLICK_SECRET_KEY || "demo-click-secret",
  };
}

export const ACCOUNT_KEY = "profile_id";

// ---------------------------------------------------------------------------
// Payment row helpers
// ---------------------------------------------------------------------------
export async function findPaymentByProviderId(providerTransactionId: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.providerTransactionId, providerTransactionId));
  return rows[0] ?? null;
}

export async function findPaymentById(id: number) {
  const rows = await db.select().from(payments).where(eq(payments.id, id));
  return rows[0] ?? null;
}

/** Activate a subscription (idempotent — never double-credits). */
export async function activateSubscription(paymentId: number, profileId: number | null, plan = "premium") {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (!payment) return null;
  // Already credited — do nothing.
  if (payment.status === "paid") {
    return findActiveSubscription(profileId);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + PREMIUM_PERIOD_DAYS * 86400000);

  await db
    .update(payments)
    .set({ status: "paid", updatedAt: now })
    .where(eq(payments.id, paymentId));

  const targetProfileId = profileId ?? payment.profileId;
  if (targetProfileId == null) {
    return findActiveSubscription(null);
  }
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      profileId: targetProfileId,
      plan,
      status: "active",
      currentPeriodEnd: periodEnd,
      paymentId: paymentId,
    })
    .returning();

  return subscription;
}

export async function findActiveSubscription(profileId: number | null) {
  if (!profileId) return null;
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.status, "active")
      )
    )
    .orderBy(subscriptions.id);
  return sub ?? null;
}

export function subscriptionIsActive(sub: { status: string; currentPeriodEnd: Date } | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  return new Date(sub.currentPeriodEnd).getTime() > Date.now();
}

// ---------------------------------------------------------------------------
// Click — MD5 signature verification (two-step callback flow)
// ---------------------------------------------------------------------------
export function clickSignString(input: {
  clickTransId: string;
  clickPaydocId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  amount: number;
  action: number;
}): string {
  return `${input.clickTransId}${input.clickPaydocId}${input.serviceId}${input.secretKey}${input.merchantTransId}${input.amount}${input.action}`;
}

export function md5Hex(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

export function verifyClickSignature(signString: string, expected: string): boolean {
  return signString.toLowerCase() === expected.toLowerCase();
}

// ---------------------------------------------------------------------------
// Payme — JSON-RPC merchant methods
// ---------------------------------------------------------------------------
export interface PaymeRequest {
  jsonrpc?: string;
  method: string;
  params: Record<string, any>;
  id?: number;
}

function paymeError(code: number, message: string, data: unknown = null) {
  return { error: { code, message, data } };
}

/**
 * Handle a Payme JSON-RPC request body. Returns the response object to send back.
 * Implements CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction and GetStatement.
 */
export async function handlePaymeRequest(body: PaymeRequest) {
  const { method, params, id } = body;

  const account = params?.account || {};
  const profileId = account[ACCOUNT_KEY];

  if (method === "CheckPerformTransaction") {
    const amount = params.amount;
    if (!Number.isInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    if (profileId == null) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, Number(profileId)));
    if (!profile) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }
    const amountUzs = amount / 100;
    if (amountUzs !== PREMIUM_PRICE_UZS) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    return {
      id,
      result: {
        allow: true,
        additional: { profile_id: Number(profileId), purpose: "premium" },
      },
    };
  }

  if (method === "CreateTransaction") {
    const txnId = String(params.id);
    const amount = params.amount;
    if (!Number.isInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    const existing = await findPaymentByProviderId(txnId);
    if (existing) {
      // Idempotent: return the existing transaction.
      return {
        id,
        result: {
          create_time: Math.floor(existing.createdAt.getTime() / 1000),
          transaction: String(txnId),
          state: existing.status === "paid" ? 2 : 1,
        },
      };
    }
    if (profileId == null) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }
    const [payment] = await db
      .insert(payments)
      .values({
        profileId: Number(profileId),
        provider: "payme",
        providerTransactionId: txnId,
        amount: amount / 100,
        currency: "UZS",
        status: "pending",
        purpose: "premium",
      })
      .returning();

    const createTime = Math.floor(payment.createdAt.getTime() / 1000);
    return {
      id,
      result: {
        create_time: createTime,
        transaction: txnId,
        state: 1,
      },
    };
  }

  if (method === "PerformTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    const now = new Date();
    // Idempotent: if already paid, return paid state without double-crediting.
    if (payment.status === "paid") {
      return {
        id,
        result: {
          perform_time: Math.floor(now.getTime() / 1000),
          transaction: txnId,
          state: 2,
        },
      };
    }
    // activateSubscription marks the payment as paid and provisions the
    // subscription exactly once (idempotent for repeated callbacks).
    await activateSubscription(payment.id, payment.profileId);
    return {
      id,
      result: {
        perform_time: Math.floor(now.getTime() / 1000),
        transaction: txnId,
        state: 2,
      },
    };
  }

  if (method === "CancelTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    if (payment.status === "paid") {
      await db
        .update(payments)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } else {
      await db
        .update(payments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    }
    const now = new Date();
    return {
      id,
      result: {
        cancel_time: Math.floor(now.getTime() / 1000),
        transaction: txnId,
        state: -1,
      },
    };
  }

  if (method === "CheckTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    const state = payment.status === "paid" ? 2 : payment.status === "cancelled" ? -1 : payment.status === "refunded" ? -2 : 1;
    return {
      id,
      result: {
        create_time: Math.floor(payment.createdAt.getTime() / 1000),
        perform_time: 0,
        cancel_time: 0,
        transaction: txnId,
        state,
        reason: null,
      },
    };
  }

  if (method === "GetStatement") {
    const { from, to } = params;
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);
    const all = await db.select().from(payments).where(eq(payments.provider, "payme"));
    const transactions = all
      .filter((p) => p.createdAt >= fromDate && p.createdAt <= toDate)
      .map((p) => ({
        id: p.providerTransactionId,
        time: Math.floor(p.createdAt.getTime() / 1000),
        amount: Math.round(p.amount * 100),
        account: { profile_id: p.profileId },
        create_time: Math.floor(p.createdAt.getTime() / 1000),
        perform_time: 0,
        cancel_time: 0,
        transaction: p.providerTransactionId,
        state: p.status === "paid" ? 2 : p.status === "cancelled" ? -1 : 1,
        reason: null,
      }));
    return { id, result: { transactions } };
  }

  return { id, ...paymeError(-32601, "Method not found") };
}
