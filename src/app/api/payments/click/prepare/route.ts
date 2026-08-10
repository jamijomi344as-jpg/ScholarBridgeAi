import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clickConfig, clickSignString, md5Hex, verifyClickSignature } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Click two-step flow — step 1 (prepare).
 * Click posts here with action=1. We verify the MD5 signature and return the
 * merchant_prepare_id (our payment id) to be used in the confirm step.
 */
export async function POST(req: Request) {
  try {
    const p = await req.json();
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      amount,
      action,
      sign_time,
      sign_string,
    } = p;

    const cfg = clickConfig();
    const amountInt = Number(amount);
    const merchantTransId = String(merchant_trans_id || "");

    // Verify signature.
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

    const [payment] = await db.select().from(payments).where(eq(payments.id, Number(merchantTransId)));

    if (!payment) {
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: -6,
        error_note: "Transaction not found",
      });
    }

    if (payment.status === "paid") {
      return NextResponse.json({
        click_trans_id,
        merchant_trans_id: merchantTransId,
        error: -4,
        error_note: "Already paid",
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

    return NextResponse.json({
      click_trans_id,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: "Success",
    });
  } catch (error) {
    console.error("POST /api/payments/click/prepare error:", error);
    return NextResponse.json({ error: -5, error_note: "Server error" }, { status: 500 });
  }
}
