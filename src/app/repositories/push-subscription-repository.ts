import { db } from '#database/db.js';
import { pushNotificationLogs, pushSubscriptions } from '#database/schema.js';
import { and, desc, eq } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type PushSubscriptionRow = InferSelectModel<typeof pushSubscriptions>;
export type PushSubscriptionInsert = InferInsertModel<typeof pushSubscriptions>;
export type PushNotificationLogRow = InferSelectModel<typeof pushNotificationLogs>;

export type PushSubscriptionUpdate = Partial<
    Pick<
        PushSubscriptionInsert,
        | 'p256dhKey'
        | 'authKey'
        | 'userAgent'
        | 'ipAddress'
        | 'deviceType'
        | 'browserName'
        | 'browserVersion'
        | 'osName'
        | 'osVersion'
        | 'notificationTypes'
        | 'timezone'
        | 'isActive'
    >
>;

export type PushSubscriptionLogSummary = Pick<
    PushNotificationLogRow,
    'id' | 'messageTitle' | 'status' | 'sentAt'
>;

export type PushSubscriptionWithLogs = PushSubscriptionRow & {
    notificationLogs: PushSubscriptionLogSummary[];
};

export interface IPushSubscriptionRepository {
    create(data: PushSubscriptionInsert): Promise<PushSubscriptionRow>;
    findById(id: bigint): Promise<PushSubscriptionRow | undefined>;
    findByIdAndUserId(id: bigint, userId: bigint): Promise<PushSubscriptionRow | undefined>;
    findByEndpoint(endpoint: string): Promise<PushSubscriptionRow | undefined>;
    findByUserId(userId: bigint): Promise<PushSubscriptionRow[]>;
    findByUserIdWithLogs(userId: bigint): Promise<PushSubscriptionWithLogs[]>;
    update(
        id: bigint,
        userId: bigint,
        data: PushSubscriptionUpdate,
    ): Promise<PushSubscriptionRow | undefined>;
    updateByEndpoint(
        endpoint: string,
        userId: bigint,
        data: PushSubscriptionUpdate,
    ): Promise<PushSubscriptionRow | undefined>;
    deactivate(id: bigint, userId: bigint): Promise<PushSubscriptionRow | undefined>;
    delete(id: bigint, userId: bigint): Promise<boolean>;
    getLogsBySubscriptionId(
        subscriptionId: bigint,
        userId: bigint,
        limit?: number,
    ): Promise<PushNotificationLogRow[]>;
}

export const pushSubscriptionRepository: IPushSubscriptionRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(pushSubscriptions).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create push subscription');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByIdAndUserId(id, userId) {
        return await db
            .select()
            .from(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByEndpoint(endpoint) {
        return await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, endpoint))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByUserId(userId) {
        return await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userId))
            .orderBy(desc(pushSubscriptions.createdAt));
    },

    async findByUserIdWithLogs(userId) {
        const subscriptionsData = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userId))
            .orderBy(desc(pushSubscriptions.createdAt));

        return Promise.all(
            subscriptionsData.map(async (sub) => {
                const logs = await db
                    .select({
                        id: pushNotificationLogs.id,
                        messageTitle: pushNotificationLogs.messageTitle,
                        status: pushNotificationLogs.status,
                        sentAt: pushNotificationLogs.sentAt,
                    })
                    .from(pushNotificationLogs)
                    .where(eq(pushNotificationLogs.subscriptionId, sub.id))
                    .orderBy(desc(pushNotificationLogs.sentAt))
                    .limit(5);
                return { ...sub, notificationLogs: logs };
            }),
        );
    },

    async update(id, userId, data) {
        await db
            .update(pushSubscriptions)
            .set({ ...data, updatedAt: new Date(), lastUsedAt: new Date() })
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)));
        return pushSubscriptionRepository.findById(id);
    },

    async updateByEndpoint(endpoint, userId, data) {
        await db
            .update(pushSubscriptions)
            .set({ ...data, userId, updatedAt: new Date(), lastUsedAt: new Date() })
            .where(eq(pushSubscriptions.endpoint, endpoint));
        return pushSubscriptionRepository.findByEndpoint(endpoint);
    },

    async deactivate(id, userId) {
        await db
            .update(pushSubscriptions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)));
        return pushSubscriptionRepository.findById(id);
    },

    async delete(id, userId) {
        const deleted = await db
            .delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)))
            .returning();
        return deleted.length > 0;
    },

    async getLogsBySubscriptionId(subscriptionId, userId, limit = 50) {
        return await db
            .select()
            .from(pushNotificationLogs)
            .where(
                and(
                    eq(pushNotificationLogs.subscriptionId, subscriptionId),
                    eq(pushNotificationLogs.userId, userId),
                ),
            )
            .orderBy(desc(pushNotificationLogs.sentAt))
            .limit(limit);
    },
};
