import type { HttpContext } from "#vendor/types/types.js";
import { partnerDashboardService } from "#app/services/partner-dashboard-service.js";
import type { PartnerDashboardResponse } from "shared";

export default {
  async getDashboard(context: HttpContext): Promise<PartnerDashboardResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const result = await partnerDashboardService.getStats(BigInt(userId));
    if (!result.ok) {
      context.responseData.status = result.code === "UNAUTHORIZED" ? 403 : 500;
      return { status: "error", message: result.message };
    }

    return { status: "success", ...result.data };
  },
};
