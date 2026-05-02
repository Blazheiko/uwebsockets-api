import { referralRepository } from "#app/repositories/referral-repository.js";
import { referralClickRepository } from "#app/repositories/referral-click-repository.js";
import { userRepository } from "#app/repositories/index.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import { nanoid } from "nanoid";
import config from "#config/app.js";

export const referralService = {

  async getReferralCode(userId: bigint): Promise<ServiceResult<{ referralCode: string; referralUrl: string; totalReferrals: number }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    let referralCode = user.referralCode;
    if (referralCode === null || referralCode === undefined) {
      referralCode = nanoid(10).toUpperCase();
      await userRepository.update(userId, { referralCode });
    }

    const totalReferrals = await referralRepository.countByReferrerId(userId);
    if (config.landingUrl === "") {
      return failure("INTERNAL", "Landing URL is not configured");
    }

    const referralUrl = `${config.landingUrl}/register?ref=${referralCode}`;
    return success({ referralCode, referralUrl, totalReferrals });
  },

  async findReferrerByCode(refCode: string): Promise<bigint | null> {
    const user = await userRepository.findByReferralCode(refCode);
    return user?.id ?? null;
  },

  async recordReferral(referrerId: bigint, refereeId: bigint, clickId?: bigint): Promise<void> {
    if (referrerId === refereeId) return;

    const existing = await referralRepository.findByRefereeId(refereeId);
    if (existing !== undefined) return;

    await referralRepository.create({ referrerId, refereeId });

    if (clickId !== undefined) {
      await referralClickRepository.markConvertedForReferrer(clickId, referrerId);
    }
  },
};
