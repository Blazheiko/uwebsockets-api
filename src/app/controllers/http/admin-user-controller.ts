import { userRepository } from "#app/repositories/index.js";
import type { HttpContext } from "#vendor/types/types.js";
import type { AdminUserListResponse } from "shared/responses";

function parseOptionalDate(value: string | null): Date | undefined {
  if (value === null || value === "") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default {
  async list(context: HttpContext): Promise<AdminUserListResponse> {
    const userIdParam = context.httpData.query.get("userId");
    const limitParam = context.httpData.query.get("limit");
    const dateFrom = parseOptionalDate(context.httpData.query.get("dateFrom"));
    const dateTo = parseOptionalDate(context.httpData.query.get("dateTo"));
    const promoCode = context.httpData.query.get("promoCode") ?? undefined;

    let userId: bigint | undefined;
    if (userIdParam !== null && userIdParam !== "") {
      if (!/^\d+$/.test(userIdParam)) {
        context.responseData.status = 400;
        return { status: "error", message: "userId must be a numeric string" };
      }
      userId = BigInt(userIdParam);
    }

    let limit: number | undefined;
    if (limitParam !== null && limitParam !== "") {
      limit = Number.parseInt(limitParam, 10);
      if (Number.isNaN(limit)) {
        context.responseData.status = 400;
        return { status: "error", message: "limit must be a number" };
      }
    }

    const filters = {
      ...(userId !== undefined && { userId }),
      ...(dateFrom !== undefined && { dateFrom }),
      ...(dateTo !== undefined && { dateTo }),
      ...(promoCode !== undefined && promoCode !== "" && { promoCode }),
      ...(limit !== undefined && { limit }),
    };

    const result = await userRepository.listAdminUsers(filters);

    return {
      status: "success",
      items: result.items.map((user) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        promoCode: user.promoCode,
        hasReferralToken: user.referralCode !== null,
        registeredAt: user.createdAt.toISOString(),
      })),
      total: result.total,
    };
  },
};
