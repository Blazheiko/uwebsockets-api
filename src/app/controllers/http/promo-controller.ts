import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { promoCodeService } from "#app/services/promo-code-service.js";
import { promoCodeRepository } from "#app/repositories/promo-code-repository.js";
import type {
  ValidatePromoCodeResponse,
  CreatePromoCodeResponse,
  ListPromoCodesResponse,
} from "shared";
import type {
  ValidatePromoCodeInput,
  CreatePromoCodeInput,
} from "shared/schemas";

export default {
  async validate(context: HttpContext<ValidatePromoCodeInput>): Promise<ValidatePromoCodeResponse> {
    const code = context.httpData.query.get("code") ?? "";
    if (code === "") {
      context.responseData.status = 400;
      return { status: "error", message: "code query param required" };
    }

    const result = await promoCodeService.validate(code);
    if (!result.ok) {
      if (result.message.includes("expired")) {
        return { status: "expired", message: result.message };
      }
      if (result.message.includes("limit")) {
        return { status: "exhausted", message: result.message };
      }
      return { status: "invalid", message: result.message };
    }

    return {
      status: "valid",
      benefitType: result.data.benefitType,
      benefitValue: result.data.benefitValue,
    };
  },

  async create(context: HttpContext<CreatePromoCodeInput>): Promise<CreatePromoCodeResponse> {
    const adminId = context.auth.getUserId();
    if (adminId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const createBase = {
      code: payload.code,
      benefitType: payload.benefitType,
      benefitValue: payload.benefitValue,
      ...(payload.discountPercent !== undefined && { discountPercent: payload.discountPercent }),
      ...(payload.partnerId !== undefined && { partnerId: BigInt(payload.partnerId) }),
      maxUses: payload.maxUses,
    };
    const createPayload = payload.expiresAt !== undefined
      ? { ...createBase, expiresAt: new Date(payload.expiresAt) }
      : createBase;

    const result = await promoCodeService.create(createPayload, BigInt(adminId));

    if (!result.ok) {
      context.responseData.status = result.code === "CONFLICT" ? 409 : 500;
      return { status: "error", message: result.message };
    }

    return { status: "success", id: String(result.data.id), code: result.data.code };
  },

  async list(_context: HttpContext): Promise<ListPromoCodesResponse> {
    const items = await promoCodeRepository.listAll();
    return {
      status: "success",
      items: items.map((p) => ({
        id: String(p.id),
        code: p.code,
        benefitType: p.benefitType,
        benefitValue: p.benefitValue,
        discountPercent: p.discountPercent,
        maxUses: p.maxUses,
        currentUses: p.currentUses,
        isActive: p.isActive,
        expiresAt: p.expiresAt !== null ? p.expiresAt.toISOString() : null,
        partnerId: p.partnerId !== null ? String(p.partnerId) : null,
      })),
    };
  },

  async deactivate(context: HttpContext): Promise<{ status: string; message?: string }> {
    const id = BigInt(context.httpData.params["id"] ?? "0");
    await promoCodeRepository.deactivate(id);
    return { status: "success" };
  },
};
