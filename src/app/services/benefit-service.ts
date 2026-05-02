import { userRepository } from "#app/repositories/index.js";
import type { PromoCodeRow } from "#app/repositories/promo-code-repository.js";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function applyBenefit(userId: bigint, promo: PromoCodeRow): Promise<void> {
  // Always apply discountPercent if set on the promo code
  if (promo.discountPercent > 0) {
    const user = await userRepository.findById(userId);
    if ((user?.discountPercent ?? 0) < promo.discountPercent) {
      await userRepository.update(userId, { discountPercent: promo.discountPercent });
    }
  }

  switch (promo.benefitType) {
    case "PREMIUM_DAYS":
    case "FREE_TRIAL": {
      const now = new Date();
      const user = await userRepository.findById(userId);
      const base = user?.premiumUntil !== null && user?.premiumUntil !== undefined && user.premiumUntil > now
        ? user.premiumUntil
        : now;
      await userRepository.update(userId, { premiumUntil: addDays(base, promo.benefitValue) });
      break;
    }
    case "BETA_ACCESS":
      await userRepository.update(userId, { betaAccess: true });
      break;
    case "PARTNER_DISCOUNT": {
      const user = await userRepository.findById(userId);
      const current = user?.discountPercent ?? 0;
      if (promo.benefitValue > current) {
        await userRepository.update(userId, { discountPercent: promo.benefitValue });
      }
      break;
    }
  }
}
