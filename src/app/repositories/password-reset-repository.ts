import { db } from "#database/db.js";
import { passwordResetTokens } from "#database/schema.js";
import { and, eq, isNull, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

export type PasswordResetTokenRow = InferSelectModel<typeof passwordResetTokens>;
export type PasswordResetTokenInsert = InferInsertModel<typeof passwordResetTokens>;

export interface IPasswordResetRepository {
  create(data: PasswordResetTokenInsert): Promise<PasswordResetTokenRow>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRow | undefined>;
  invalidatePendingByUserId(userId: bigint): Promise<number>;
  markUsed(id: bigint, usedAt?: Date): Promise<PasswordResetTokenRow | undefined>;
}

export const passwordResetRepository: IPasswordResetRepository = {
  async create(data) {
    const [created] = await db.insert(passwordResetTokens).values(data).returning();
    if (created === undefined) {
      throw new Error("Failed to create password reset token");
    }

    return created;
  },

  async findByTokenHash(tokenHash) {
    return await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async invalidatePendingByUserId(userId) {
    const result = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .returning({ id: passwordResetTokens.id });

    return result.length;
  },

  async markUsed(id, usedAt = new Date()) {
    return await db
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(eq(passwordResetTokens.id, id))
      .returning()
      .then((rows) => rows.at(0));
  },
};
