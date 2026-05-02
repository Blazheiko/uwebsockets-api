import { db } from "#database/db.js";
import { referralLinkClicks } from "#database/schema.js";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type ReferralClickRow = InferSelectModel<typeof referralLinkClicks>;
export type ReferralClickInsert = InferInsertModel<typeof referralLinkClicks>;

export interface DailyActivity {
  date: string;
  clicks: number;
  registrations: number;
}

export interface IReferralClickRepository {
  create(data: ReferralClickInsert): Promise<ReferralClickRow>;
  markConvertedForReferrer(clickId: bigint, referrerId: bigint): Promise<boolean>;
  countTotalByReferrerId(referrerId: bigint): Promise<number>;
  countUniqueByReferrerId(referrerId: bigint): Promise<number>;
  countConvertedByReferrerId(referrerId: bigint): Promise<number>;
  getDailyActivity(referrerId: bigint, days: number): Promise<DailyActivity[]>;
}

export const referralClickRepository: IReferralClickRepository = {
  async create(data) {
    const [row] = await db.insert(referralLinkClicks).values(data).returning();
    if (row === undefined) {
      throw new Error("Failed to create referral click");
    }
    return row;
  },

  async markConvertedForReferrer(clickId, referrerId) {
    const [row] = await db
      .update(referralLinkClicks)
      .set({ convertedAt: new Date() })
      .where(
        and(
          eq(referralLinkClicks.id, clickId),
          eq(referralLinkClicks.referrerId, referrerId),
          isNull(referralLinkClicks.convertedAt),
        ),
      )
      .returning();
    return row !== undefined;
  },

  async countTotalByReferrerId(referrerId) {
    const [row] = await db
      .select({ total: count() })
      .from(referralLinkClicks)
      .where(eq(referralLinkClicks.referrerId, referrerId));
    return row?.total ?? 0;
  },

  async countUniqueByReferrerId(referrerId) {
    const [row] = await db
      .select({ unique: sql<number>`COUNT(DISTINCT ${referralLinkClicks.fingerprint})` })
      .from(referralLinkClicks)
      .where(eq(referralLinkClicks.referrerId, referrerId));
    return row?.unique ?? 0;
  },

  async countConvertedByReferrerId(referrerId) {
    const [row] = await db
      .select({ total: count() })
      .from(referralLinkClicks)
      .where(
        and(
          eq(referralLinkClicks.referrerId, referrerId),
          sql`${referralLinkClicks.convertedAt} IS NOT NULL`,
        ),
      );
    return row?.total ?? 0;
  },

  async getDailyActivity(referrerId, days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(DATE(${referralLinkClicks.createdAt}), 'YYYY-MM-DD')`,
        clicks: count(),
        registrations: sql<number>`COUNT(${referralLinkClicks.convertedAt})`,
      })
      .from(referralLinkClicks)
      .where(
        and(
          eq(referralLinkClicks.referrerId, referrerId),
          gte(referralLinkClicks.createdAt, since),
        ),
      )
      .groupBy(sql`DATE(${referralLinkClicks.createdAt})`)
      .orderBy(sql`DATE(${referralLinkClicks.createdAt}) ASC`);
    return rows as DailyActivity[];
  },
};
