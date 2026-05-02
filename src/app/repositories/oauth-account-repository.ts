import { db } from '#database/db.js';
import { oauthAccounts } from '#database/schema.js';
import { eq, and } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type OAuthAccountRow = InferSelectModel<typeof oauthAccounts>;
export type OAuthAccountInsert = InferInsertModel<typeof oauthAccounts>;

export interface IOAuthAccountRepository {
  findByProviderAndProviderId(
    provider: string,
    providerUserId: string,
  ): Promise<OAuthAccountRow | undefined>;
  findByUserId(userId: bigint): Promise<OAuthAccountRow[]>;
  create(data: OAuthAccountInsert): Promise<OAuthAccountRow>;
  updateTokens(
    id: bigint,
    accessToken: string | null,
    refreshToken: string | null,
  ): Promise<void>;
}

export const oauthAccountRepository: IOAuthAccountRepository = {
  async findByProviderAndProviderId(provider, providerUserId) {
    return db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerUserId, providerUserId),
        ),
      )
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findByUserId(userId) {
    return db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId));
  },

  async create(data) {
    const now = new Date();
    const [created] = await db.insert(oauthAccounts).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    if (created === undefined) {
      throw new Error('Failed to create oauth account');
    }
    return created;
  },

  async updateTokens(id, accessToken, refreshToken) {
    await db
      .update(oauthAccounts)
      .set({ accessToken, refreshToken, updatedAt: new Date() })
      .where(eq(oauthAccounts.id, id));
  },
};
