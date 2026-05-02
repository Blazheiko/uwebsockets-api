import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { userRepository } from "#app/repositories/index.js";
import { referralClickRepository } from "#app/repositories/referral-click-repository.js";
import { referralRepository } from "#app/repositories/referral-repository.js";
import { promoCodeRepository } from "#app/repositories/promo-code-repository.js";
import { promoCodeService } from "#app/services/promo-code-service.js";
import { referralService } from "#app/services/referral-service.js";
import { partnerDashboardService } from "#app/services/partner-dashboard-service.js";
import type {
  AdminUserSearchResponse,
  AdminCreatePartnerResponse,
  AdminPartnerListResponse,
  AdminPartnerDetailResponse,
} from "shared";
import type { CreatePartnerInput } from "shared/schemas";

export default {
  async search(context: HttpContext): Promise<AdminUserSearchResponse> {
    const email = context.httpData.query.get("email") ?? "";
    if (email === "") {
      context.responseData.status = 400;
      return { status: "error", message: "email query param required" };
    }
    const user = await userRepository.findByEmail(email);
    if (user === undefined) return { status: "not_found" };
    return {
      status: "found",
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },

  async create(context: HttpContext<CreatePartnerInput>): Promise<AdminCreatePartnerResponse> {
    const payload = getTypedPayload(context);
    const userId = BigInt(payload.userId);

    const user = await userRepository.findById(userId);
    if (user === undefined) {
      context.responseData.status = 404;
      return { status: "error", message: "User not found" };
    }
    if (user.role === "partner") {
      context.responseData.status = 409;
      return { status: "conflict", message: "User is already a partner" };
    }

    // 1. Assign partner role
    await userRepository.update(userId, { role: "partner" });

    // 2. Create promo code if provided — best-effort
    let promoCodeStr: string | null = null;
    if (payload.promoCode !== undefined) {
      const adminId = context.auth.getUserId();
      if (adminId !== null) {
        const promoBase = {
          code: payload.promoCode.code,
          benefitType: payload.promoCode.benefitType,
          benefitValue: payload.promoCode.benefitValue,
          maxUses: payload.promoCode.maxUses,
          partnerId: userId,
        };
        const promoPayload = payload.promoCode.expiresAt !== undefined
          ? { ...promoBase, expiresAt: new Date(payload.promoCode.expiresAt) }
          : promoBase;
        const promoResult = await promoCodeService.create(promoPayload, BigInt(adminId));
        if (promoResult.ok) {
          promoCodeStr = promoResult.data.code;
        } else {
          context.logger.warn({ userId, code: payload.promoCode.code }, "Failed to create partner promo code");
        }
      }
    }
    const existingCodes = await promoCodeRepository.findAllByPartnerId(userId);

    // 3. Ensure referralCode exists
    await referralService.getReferralCode(userId);

    const allCodes = promoCodeStr !== null
      ? [...existingCodes.map((c) => c.code), promoCodeStr]
      : existingCodes.map((c) => c.code);

    return {
      status: "success",
      partner: {
        id: String(userId),
        name: user.name,
        email: user.email,
        partnerSince: new Date().toISOString(),
        promoCodes: allCodes,
        totalClicks: 0,
        totalRegistrations: 0,
      },
    };
  },

  async list(_context: HttpContext): Promise<AdminPartnerListResponse> {
    const partners = await userRepository.findByRole("partner");
    const items = await Promise.all(
      partners.map(async (p) => {
        const [clicks, registrations, promoCodes] = await Promise.all([
          referralClickRepository.countTotalByReferrerId(p.id),
          referralRepository.countByReferrerId(p.id),
          promoCodeRepository.findAllByPartnerId(p.id),
        ]);
        return {
          id: String(p.id),
          name: p.name,
          email: p.email,
          partnerSince: p.createdAt.toISOString(),
          promoCodes: promoCodes.map((c) => c.code),
          totalClicks: clicks,
          totalRegistrations: registrations,
        };
      }),
    );
    return { status: "success", items, total: items.length };
  },

  async getById(context: HttpContext): Promise<AdminPartnerDetailResponse> {
    const id = BigInt(context.httpData.params["id"] ?? "0");
    const result = await partnerDashboardService.getStats(id);
    if (!result.ok) {
      context.responseData.status = result.code === "NOT_FOUND" ? 404 : 403;
      return { status: "error", message: result.message };
    }
    return { status: "success", ...result.data };
  },

  async setRole(context: HttpContext): Promise<{ status: string; message?: string }> {
    const id = BigInt(context.httpData.params["id"] ?? "0");
    const body = context.httpData.payload as { role?: string } | undefined;
    const role = body?.role;
    if (role !== "user" && role !== "partner") {
      context.responseData.status = 400;
      return { status: "error", message: "role must be 'user' or 'partner'" };
    }
    const user = await userRepository.findById(id);
    if (user === undefined) {
      context.responseData.status = 404;
      return { status: "error", message: "User not found" };
    }
    if (user.role === "admin") {
      context.responseData.status = 403;
      return { status: "error", message: "Cannot change admin role" };
    }
    await userRepository.update(id, { role });
    return { status: "success" };
  },

  async remove(context: HttpContext): Promise<{ status: string; message?: string }> {
    const id = BigInt(context.httpData.params["id"] ?? "0");
    await userRepository.update(id, { role: "user" });
    return { status: "success" };
  },
};
