import { db } from "#database/db.js";
import { promoCodes } from "#database/schema.js";
import { and, eq, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type PromoCodeRow = InferSelectModel<typeof promoCodes>;
export type PromoCodeInsert = InferInsertModel<typeof promoCodes>;

export interface IPromoCodeRepository {
  create(data: PromoCodeInsert): Promise<PromoCodeRow>;
  findByCode(code: string): Promise<PromoCodeRow | undefined>;
  findById(id: bigint): Promise<PromoCodeRow | undefined>;
  findAllByPartnerId(partnerId: bigint): Promise<PromoCodeRow[]>;
  incrementUses(id: bigint): Promise<boolean>;
  deactivate(id: bigint): Promise<void>;
  listAll(): Promise<PromoCodeRow[]>;
}

export const promoCodeRepository: IPromoCodeRepository = {
  async create(data) {
    const [row] = await db.insert(promoCodes).values(data).returning();
    if (row === undefined) {
      throw new Error("Failed to create promo code");
    }
    return row;
  },

  async findByCode(code) {
    return await db
      .select()
      .from(promoCodes)
      .where(sql`UPPER(${promoCodes.code}) = UPPER(${code})`)
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findById(id) {
    return await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findAllByPartnerId(partnerId) {
    return await db
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.partnerId, partnerId), eq(promoCodes.isActive, true)))
      .orderBy(promoCodes.createdAt);
  },

  async incrementUses(id) {
    const result = await db
      .update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(promoCodes.id, id),
          sql`${promoCodes.maxUses} = 0 OR ${promoCodes.currentUses} < ${promoCodes.maxUses}`,
        ),
      )
      .returning();
    return result.length > 0;
  },

  async deactivate(id) {
    await db
      .update(promoCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(promoCodes.id, id));
  },

  async listAll() {
    return await db.select().from(promoCodes).orderBy(promoCodes.createdAt);
  },
};
