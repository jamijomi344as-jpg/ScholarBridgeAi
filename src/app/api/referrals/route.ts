import { NextResponse } from "next/server";
import { getReferralOverview, applyReferralCode } from "@/lib/referrals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);
    const overview = await getReferralOverview(profileId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GET /api/referrals error:", error);
    return NextResponse.json({ error: "Failed to fetch referral info" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, referralCode } = body;
    if (!profileId || !referralCode) {
      return NextResponse.json({ error: "profileId and referralCode are required" }, { status: 400 });
    }
    const result = await applyReferralCode(Number(profileId), referralCode);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ referral: result.referral });
  } catch (error) {
    console.error("POST /api/referrals error:", error);
    return NextResponse.json({ error: "Failed to apply referral code" }, { status: 500 });
  }
}
