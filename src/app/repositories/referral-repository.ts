import { db } from "#database/db.js";
import { referralUsages } from "#database/schema.js";
import { count, eq, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type ReferralUsageRow = InferSelectModel<typeof referralUsages>;
export type ReferralUsageInsert = InferInsertModel<typeof referralUsages>;

export interface IReferralRepository {
  create(data: ReferralUsageInsert): Promise<ReferralUsageRow>;
  findByRefereeId(refereeId: bigint): Promise<ReferralUsageRow | undefined>;
  countByReferrerId(referrerId: bigint): Promise<number>;
  markRewardGranted(id: bigint): Promise<void>;
  getDailyRegistrations(referrerId: bigint, days: number): Promise<{ date: string; registrations: number }[]>;
}

export const referralRepository: IReferralRepository = {
  async create(data) {
    const [row] = await db.insert(referralUsages).values(data).returning();
    if (row === undefined) {
      throw new Error("Failed to create referral usage");
    }
    return row;
  },

  async findByRefereeId(refereeId) {
    return await db
      .select()
      .from(referralUsages)
      .where(eq(referralUsages.refereeId, refereeId))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async countByReferrerId(referrerId) {
    const [row] = await db
      .select({ total: count() })
      .from(referralUsages)
      .where(eq(referralUsages.referrerId, referrerId));
    return row?.total ?? 0;
  },

  async markRewardGranted(id) {
    await db
      .update(referralUsages)
      .set({ rewardGrantedAt: new Date() })
      .where(eq(referralUsages.id, id));
  },

  async getDailyRegistrations(referrerId, days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(DATE(${referralUsages.createdAt}), 'YYYY-MM-DD')`,
        registrations: count(),
      })
      .from(referralUsages)
      .where(
        sql`${referralUsages.referrerId} = ${referrerId} AND ${referralUsages.createdAt} >= ${since}`,
      )
      .groupBy(sql`DATE(${referralUsages.createdAt})`)
      .orderBy(sql`DATE(${referralUsages.createdAt}) ASC`);
    return rows as { date: string; registrations: number }[];
  },
};
