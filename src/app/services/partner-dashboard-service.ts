import { referralService } from "#app/services/referral-service.js";
import { referralClickRepository } from "#app/repositories/referral-click-repository.js";
import { referralRepository } from "#app/repositories/referral-repository.js";
import { userRepository } from "#app/repositories/index.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";

export interface PartnerStats {
  referralCode: string;
  referralUrl: string;
  totalClicks: number;
  uniqueClicks: number;
  totalRegistrations: number;
  conversionRate: number;
  recentActivity: { date: string; clicks: number; registrations: number }[];
}

export const partnerDashboardService = {

  async getStats(userId: bigint): Promise<ServiceResult<PartnerStats>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }
    if (user.role !== "partner" && user.role !== "admin") {
      return failure("UNAUTHORIZED", "Partner access required");
    }

    const refResult = await referralService.getReferralCode(userId);
    if (!refResult.ok) return refResult;

    const [totalClicks, uniqueClicks, totalRegistrations, clickActivity, regActivity] = await Promise.all([
      referralClickRepository.countTotalByReferrerId(userId),
      referralClickRepository.countUniqueByReferrerId(userId),
      referralRepository.countByReferrerId(userId),
      referralClickRepository.getDailyActivity(userId, 30),
      referralRepository.getDailyRegistrations(userId, 30),
    ]);

    // Merge click activity and registration activity — union of all dates from both sources
    const clicksByDate = new Map(clickActivity.map((d) => [d.date, d.clicks]));
    const regByDate = new Map(regActivity.map((r) => [r.date, r.registrations]));
    const allDates = Array.from(new Set([...clicksByDate.keys(), ...regByDate.keys()])).sort();
    const recentActivity = allDates.map((date) => ({
      date,
      clicks: clicksByDate.get(date) ?? 0,
      registrations: regByDate.get(date) ?? 0,
    }));

    const conversionRate =
      totalClicks > 0
        ? Math.round((totalRegistrations / totalClicks) * 1000) / 10
        : 0;

    return success({
      referralCode: refResult.data.referralCode,
      referralUrl: refResult.data.referralUrl,
      totalClicks,
      uniqueClicks,
      totalRegistrations,
      conversionRate,
      recentActivity,
    });
  },

  async recordClick(refCode: string, fingerprint: string | null): Promise<bigint | null> {
    const referrerId = await referralService.findReferrerByCode(refCode);
    if (referrerId === null) return null;
    const click = await referralClickRepository.create({ referrerId, fingerprint });
    return click.id;
  },
};
