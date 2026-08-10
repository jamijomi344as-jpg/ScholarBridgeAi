import { NextResponse } from "next/server";
import { handlePaymeRequest, type PaymeRequest } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Payme merchant webhook (JSON-RPC over HTTP).
 * Implements CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction and GetStatement with correct error codes
 * and idempotency so repeated callbacks never double-credit a subscription.
 */
export async function POST(req: Request) {
  try {
    const body: PaymeRequest = await req.json();
    const response = await handlePaymeRequest(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/payments/payme/webhook error:", error);
    return NextResponse.json(
      { error: { code: -32700, message: "Parse error", data: null } },
      { status: 400 }
    );
  }
}
