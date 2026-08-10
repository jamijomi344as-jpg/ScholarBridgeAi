import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  clickConfig,
  clickSignString,
  md5Hex,
  verifyClickSignature,
  activateSubscription,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Click two-step flow — step 2 (complete/confirm).
 * Click posts here with action=0. We verify the MD5 signature, mark the payment
 * as paid, and activate the subscription (idempotently).
 */
export async function POST(req: Request) {
  try {
    const p = await req.json();
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      error: clickError,
      error_note,
      sign_time,
      sign_string,
    } = p;

    const cfg = clickConfig();
    const amountInt = Number(amount);
    const merchantTransId = String(merchant_trans_id || "");
    const paymentId = Number(merchant_prepare_id || merchant_trans_id);

    if (clickError !== 0 && clickError !== "0" && clickError !== undefined && clickError !== null) {
      // Click reported an error upstream; reflect it without charging.
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: clickError ?? -5,
        error_note: error_note || "Click error",
      });
    }

    const expected = md5Hex(
      clickSignString({
        clickTransId: String(click_trans_id || ""),
        clickPaydocId: String(click_paydoc_id || ""),
        serviceId: String(service_id || ""),
        secretKey: cfg.secretKey,
        merchantTransId,
        amount: amountInt,
        action: Number(action),
      })
    );

    if (!verifyClickSignature(String(sign_string || ""), expected)) {
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: -1,
        error_note: "SIGN_CHECK_FAILED",
      });
    }

    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) {
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: -6,
        error_note: "Transaction not found",
      });
    }

    if (Number(payment.amount) !== amountInt) {
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: -2,
        error_note: "Incorrect amount",
      });
    }

    await activateSubscription(payment.id, payment.profileId, "premium");

    return NextResponse.json({
      click_trans_id,
      merchant_trans_id: merchantTransId,
      merchant_confirm_id: payment.id,
      error: 0,
      error_note: "Success",
    });
  } catch (error) {
    console.error("POST /api/payments/click/complete error:", error);
    return NextResponse.json({ error: -5, error_note: "Server error" }, { status: 500 });
  }
}
