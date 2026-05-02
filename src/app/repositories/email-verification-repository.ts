import { db } from "#database/db.js";
import { emailVerifications } from "#database/schema.js";
import { and, eq, isNull, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

export type EmailVerificationRow = InferSelectModel<typeof emailVerifications>;
export type EmailVerificationInsert = InferInsertModel<typeof emailVerifications>;

export interface IEmailVerificationRepository {
  create(data: EmailVerificationInsert): Promise<EmailVerificationRow>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationRow | undefined>;
  invalidatePendingByUserId(userId: bigint): Promise<number>;
  markUsed(id: bigint, usedAt?: Date): Promise<EmailVerificationRow | undefined>;
}

export const emailVerificationRepository: IEmailVerificationRepository = {
  async create(data) {
    const [created] = await db.insert(emailVerifications).values(data).returning();
    if (created === undefined) {
      throw new Error("Failed to create email verification");
    }

    return created;
  },

  async findByTokenHash(tokenHash) {
    return await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async invalidatePendingByUserId(userId) {
    const result = await db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerifications.userId, userId),
          isNull(emailVerifications.usedAt),
        ),
      )
      .returning({ id: emailVerifications.id });

    return result.length;
  },

  async markUsed(id, usedAt = new Date()) {
    return await db
      .update(emailVerifications)
      .set({ usedAt })
      .where(eq(emailVerifications.id, id))
      .returning()
      .then((rows) => rows.at(0));
  },
};
