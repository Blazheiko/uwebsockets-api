import { db } from '#database/db.js';
import { videoCalls } from '#database/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type VideoCallRow = InferSelectModel<typeof videoCalls>;
export type VideoCallInsert = InferInsertModel<typeof videoCalls>;

export interface IVideoCallRepository {
    create(data: {
        callerId: bigint;
        calleeId: bigint;
        startedAt: Date;
    }): Promise<VideoCallRow>;
    findById(id: bigint): Promise<VideoCallRow | undefined>;
    finish(data: {
        id: bigint;
        callerId: bigint;
        calleeId: bigint;
        endedAt: Date;
    }): Promise<VideoCallRow | undefined>;
}

export const videoCallRepository: IVideoCallRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(videoCalls).values({
            callerId: data.callerId,
            calleeId: data.calleeId,
            startedAt: data.startedAt,
            createdAt: now,
            updatedAt: now,
        }).returning();

        if (created === undefined) {
            throw new Error('Failed to create video call');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(videoCalls)
            .where(eq(videoCalls.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async finish(data) {
        const [updated] = await db
            .update(videoCalls)
            .set({ endedAt: data.endedAt, updatedAt: new Date() })
            .where(
                and(
                    eq(videoCalls.id, data.id),
                    eq(videoCalls.callerId, data.callerId),
                    eq(videoCalls.calleeId, data.calleeId),
                    isNull(videoCalls.endedAt),
                ),
            )
            .returning();

        return updated ?? await videoCallRepository.findById(data.id);
    },
};
