import { db } from "#database/db.js";
import { translatorRealtimeMessages } from "#database/schema.js";
import { asc, eq } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type TranslatorRealtimeMessageRow = InferSelectModel<
  typeof translatorRealtimeMessages
>;
export type TranslatorRealtimeMessageInsert = InferInsertModel<
  typeof translatorRealtimeMessages
>;

export interface ITranslatorRealtimeRepository {
  upsertMessage(
    data: TranslatorRealtimeMessageInsert,
  ): Promise<TranslatorRealtimeMessageRow>;
  findMessagesBySessionId(
    sessionId: bigint,
  ): Promise<TranslatorRealtimeMessageRow[]>;
  deleteMessagesBySessionId(sessionId: bigint): Promise<number>;
}

export const translatorRealtimeRepository: ITranslatorRealtimeRepository = {
  async upsertMessage(data) {
    const now = new Date();
    const [saved] = await db
      .insert(translatorRealtimeMessages)
      .values({
        ...data,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: translatorRealtimeMessages.providerItemId,
        set: {
          role: data.role,
          side: data.side ?? null,
          modality: data.modality,
          sourceText: data.sourceText ?? null,
          outputText: data.outputText ?? null,
          sourceLang: data.sourceLang ?? null,
          targetLang: data.targetLang ?? null,
          replyToProviderItemId: data.replyToProviderItemId ?? null,
          updatedAt: now,
        },
      })
      .returning();

    if (saved === undefined) {
      throw new Error("Failed to upsert translator realtime message");
    }

    return saved;
  },

  async findMessagesBySessionId(sessionId) {
    return await db
      .select()
      .from(translatorRealtimeMessages)
      .where(eq(translatorRealtimeMessages.sessionId, sessionId))
      .orderBy(
        asc(translatorRealtimeMessages.createdAt),
        asc(translatorRealtimeMessages.id),
      );
  },

  async deleteMessagesBySessionId(sessionId) {
    const deleted = await db
      .delete(translatorRealtimeMessages)
      .where(eq(translatorRealtimeMessages.sessionId, sessionId))
      .returning();
    return deleted.length;
  },
};
