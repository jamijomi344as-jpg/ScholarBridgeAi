import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import {
  PREMIUM_PRICE_UZS,
  PREMIUM_CURRENCY,
  paymeConfig,
  clickConfig,
} from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, provider } = body;

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    if (!["payme", "click"].includes(provider)) {
      return NextResponse.json({ error: "provider must be 'payme' or 'click'" }, { status: 400 });
    }

    const [payment] = await db
      .insert(payments)
      .values({
        profileId: Number(profileId),
        provider,
        providerTransactionId: "",
        amount: PREMIUM_PRICE_UZS,
        currency: PREMIUM_CURRENCY,
        status: "pending",
        purpose: "premium",
      })
      .returning();

    let checkoutUrl = "";
    let params: Record<string, any> = {};

    if (provider === "click") {
      const cfg = clickConfig();
      params = {
        service_id: cfg.serviceId,
        merchant_id: cfg.merchantId,
        merchant_user_id: cfg.merchantUserId,
        amount: PREMIUM_PRICE_UZS,
        transaction_param: payment.id,
      };
      checkoutUrl = `https://my.click.uz/services/pay?service_id=${cfg.serviceId}&merchant_id=${cfg.merchantId}&amount=${PREMIUM_PRICE_UZS}&transaction_param=${payment.id}&merchant_user_id=${cfg.merchantUserId}`;
    } else {
      const cfg = paymeConfig();
      params = {
        merchant: cfg.merchantId,
        amount: PREMIUM_PRICE_UZS * 100, // tiyn
        account: { profile_id: payment.profileId },
      };
      checkoutUrl = `https://checkout.payme.uz/${cfg.merchantId}`;
    }

    return NextResponse.json({
      payment,
      checkoutUrl,
      params,
      amount: PREMIUM_PRICE_UZS,
      currency: PREMIUM_CURRENCY,
      purpose: "premium",
    });
  } catch (error) {
    console.error("POST /api/payments/initiate error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
