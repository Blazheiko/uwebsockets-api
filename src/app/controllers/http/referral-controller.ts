import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { referralService } from "#app/services/referral-service.js";
import { partnerDashboardService } from "#app/services/partner-dashboard-service.js";
import { createHash } from "node:crypto";
import type {
  GetReferralCodeResponse,
  RecordReferralClickResponse,
} from "shared";
import type { RecordReferralClickInput } from "shared/schemas";

function getDailySalt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`referral-salt::${today}`).digest("hex");
}

export default {
  async getMyReferralCode(context: HttpContext): Promise<GetReferralCodeResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const result = await referralService.getReferralCode(BigInt(userId));
    if (!result.ok) {
      context.responseData.status = result.code === "NOT_FOUND" ? 404 : 500;
      return { status: "error", message: result.message };
    }

    return {
      status: "success",
      referralCode: result.data.referralCode,
      referralUrl: result.data.referralUrl,
      totalReferrals: result.data.totalReferrals,
    };
  },

  async recordClick(context: HttpContext<RecordReferralClickInput>): Promise<RecordReferralClickResponse> {
    const payload = getTypedPayload(context);

    const ip = context.httpData.headers.get("x-forwarded-for") ?? context.httpData.headers.get("x-real-ip") ?? "unknown";
    const ua = context.httpData.headers.get("user-agent") ?? "unknown";
    const salt = getDailySalt();
    const fingerprint = createHash("sha256")
      .update(`${salt}::${ip}::${ua}`)
      .digest("hex")
      .slice(0, 64);

    const clickId = await partnerDashboardService.recordClick(payload.refCode, fingerprint);
    if (clickId === null) {
      // Return success anyway — don't leak info about invalid codes
      return { status: "error", message: "Invalid referral code" };
    }

    return { status: "success", clickId: String(clickId) };
  },
};
