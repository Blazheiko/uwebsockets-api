import { promoCodeRepository } from "#app/repositories/promo-code-repository.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import type { PromoCodeRow } from "#app/repositories/promo-code-repository.js";

export const promoCodeService = {

  async validate(code: string): Promise<ServiceResult<PromoCodeRow>> {
    const promo = await promoCodeRepository.findByCode(code);
    if (promo === undefined) {
      return failure("NOT_FOUND", "Promo code not found");
    }
    if (!promo.isActive) {
      return failure("BAD_REQUEST", "Promo code is inactive");
    }
    if (promo.expiresAt !== null && promo.expiresAt < new Date()) {
      return failure("BAD_REQUEST", "Promo code has expired");
    }
    if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
      return failure("BAD_REQUEST", "Promo code usage limit reached");
    }
    return success(promo);
  },

  async consume(promoId: bigint): Promise<boolean> {
    return await promoCodeRepository.incrementUses(promoId);
  },

  async create(
    data: {
      code: string;
      benefitType: string;
      benefitValue: number;
      discountPercent?: number;
      maxUses: number;
      expiresAt?: Date;
      partnerId?: bigint;
    },
    adminId: bigint,
  ): Promise<ServiceResult<PromoCodeRow>> {
    const existing = await promoCodeRepository.findByCode(data.code);
    if (existing !== undefined) {
      return failure("CONFLICT", "Promo code already exists");
    }
    const created = await promoCodeRepository.create({
      ...data,
      benefitType: data.benefitType as "PREMIUM_DAYS" | "BETA_ACCESS" | "FREE_TRIAL" | "PARTNER_DISCOUNT",
      discountPercent: data.discountPercent ?? 0,
      isActive: true,
      currentUses: 0,
      createdBy: adminId,
    });
    return success(created);
  },
};
