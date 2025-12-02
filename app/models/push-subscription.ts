import { db } from '#database/db.js';
import { pushSubscriptions, pushNotificationLogs } from '#database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    lastUsedAt: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
};

const required = ['userId', 'endpoint', 'p256dhKey', 'authKey'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create push subscription');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const now = new Date();
        const [subscription] = await db.insert(pushSubscriptions).values({
            userId: BigInt(payload.userId),
            endpoint: payload.endpoint,
            p256dhKey: payload.p256dhKey,
            authKey: payload.authKey,
            userAgent: payload.userAgent || null,
            ipAddress: payload.ipAddress || null,
            deviceType: payload.deviceType || null,
            browserName: payload.browserName || null,
            browserVersion: payload.browserVersion || null,
            osName: payload.osName || null,
            osVersion: payload.osVersion || null,
            notificationTypes: payload.notificationTypes || null,
            timezone: payload.timezone || null,
            isActive: payload.isActive !== undefined ? payload.isActive : true,
            lastUsedAt: now,
            createdAt: now,
            updatedAt: now,
        });

        const createdSubscription = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.id, BigInt(subscription.insertId)))
            .limit(1);

        return serializeModel(createdSubscription[0], schema, hidden);
    },

    async findById(id: bigint, userId: bigint) {
        logger.info(`find push subscription by id: ${id} for user: ${userId}`);

        const subscription = await db.select()
            .from(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)))
            .limit(1);

        if (subscription.length === 0) {
            throw new Error(`Push subscription with id ${id} not found`);
        }

        return serializeModel(subscription[0], schema, hidden);
    },

    async findByEndpoint(endpoint: string) {
        logger.info(`find push subscription by endpoint`);

        const subscription = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, endpoint))
            .limit(1);

        if (subscription.length === 0) {
            return null;
        }

        return serializeModel(subscription[0], schema, hidden);
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all push subscriptions for user: ${userId}`);

        const subscriptionsData = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userId))
            .orderBy(desc(pushSubscriptions.createdAt));

        return this.serializeArray(subscriptionsData);
    },

    async findByUserIdWithLogs(userId: bigint) {
        logger.info(`find all push subscriptions with logs for user: ${userId}`);

        const subscriptionsData = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userId))
            .orderBy(desc(pushSubscriptions.createdAt));

        // Get recent logs for each subscription
        const subscriptionsWithLogs = await Promise.all(
            subscriptionsData.map(async (sub) => {
                const logs = await db.select({
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
            })
        );

        return subscriptionsWithLogs;
    },

    async update(id: bigint, userId: bigint, payload: any) {
        logger.info(`update push subscription id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
            lastUsedAt: new Date(),
        };

        if (payload.p256dhKey !== undefined) updateData.p256dhKey = payload.p256dhKey;
        if (payload.authKey !== undefined) updateData.authKey = payload.authKey;
        if (payload.userAgent !== undefined) updateData.userAgent = payload.userAgent;
        if (payload.ipAddress !== undefined) updateData.ipAddress = payload.ipAddress;
        if (payload.deviceType !== undefined) updateData.deviceType = payload.deviceType;
        if (payload.browserName !== undefined) updateData.browserName = payload.browserName;
        if (payload.browserVersion !== undefined) updateData.browserVersion = payload.browserVersion;
        if (payload.osName !== undefined) updateData.osName = payload.osName;
        if (payload.osVersion !== undefined) updateData.osVersion = payload.osVersion;
        if (payload.notificationTypes !== undefined) updateData.notificationTypes = payload.notificationTypes;
        if (payload.timezone !== undefined) updateData.timezone = payload.timezone;
        if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

        await db.update(pushSubscriptions)
            .set(updateData)
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)));

        const updatedSubscription = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.id, id))
            .limit(1);

        if (updatedSubscription.length === 0) {
            throw new Error('Push subscription not found or access denied');
        }

        return serializeModel(updatedSubscription[0], schema, hidden);
    },

    async updateByEndpoint(endpoint: string, userId: bigint, payload: any) {
        logger.info(`update push subscription by endpoint for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
            lastUsedAt: new Date(),
            userId: userId,
        };

        if (payload.p256dhKey !== undefined) updateData.p256dhKey = payload.p256dhKey;
        if (payload.authKey !== undefined) updateData.authKey = payload.authKey;
        if (payload.userAgent !== undefined) updateData.userAgent = payload.userAgent;
        if (payload.ipAddress !== undefined) updateData.ipAddress = payload.ipAddress;
        if (payload.deviceType !== undefined) updateData.deviceType = payload.deviceType;
        if (payload.browserName !== undefined) updateData.browserName = payload.browserName;
        if (payload.browserVersion !== undefined) updateData.browserVersion = payload.browserVersion;
        if (payload.osName !== undefined) updateData.osName = payload.osName;
        if (payload.osVersion !== undefined) updateData.osVersion = payload.osVersion;
        if (payload.notificationTypes !== undefined) updateData.notificationTypes = payload.notificationTypes;
        if (payload.timezone !== undefined) updateData.timezone = payload.timezone;
        if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

        await db.update(pushSubscriptions)
            .set(updateData)
            .where(eq(pushSubscriptions.endpoint, endpoint));

        const updatedSubscription = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, endpoint))
            .limit(1);

        if (updatedSubscription.length === 0) {
            throw new Error('Push subscription not found');
        }

        return serializeModel(updatedSubscription[0], schema, hidden);
    },

    async deactivate(id: bigint, userId: bigint) {
        logger.info(`deactivate push subscription id: ${id} for user: ${userId}`);

        await db.update(pushSubscriptions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)));

        const deactivatedSubscription = await db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.id, id))
            .limit(1);

        if (deactivatedSubscription.length === 0) {
            throw new Error('Push subscription not found or access denied');
        }

        return serializeModel(deactivatedSubscription[0], schema, hidden);
    },

    async delete(id: bigint, userId: bigint) {
        logger.info(`delete push subscription id: ${id} for user: ${userId}`);

        await db.delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)));

        // Verify deletion
        const checkDeleted = await db.select({ count: sql<number>`count(*)` })
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.id, id));

        if (checkDeleted[0]?.count > 0) {
            throw new Error('Push subscription not found or access denied');
        }

        return true;
    },

    async getLogsBySubscriptionId(subscriptionId: bigint, userId: bigint, limit: number = 50) {
        logger.info(`get logs for push subscription id: ${subscriptionId} for user: ${userId}`);

        const logs = await db.select()
            .from(pushNotificationLogs)
            .where(and(
                eq(pushNotificationLogs.subscriptionId, subscriptionId),
                eq(pushNotificationLogs.userId, userId)
            ))
            .orderBy(desc(pushNotificationLogs.sentAt))
            .limit(limit);

        return logs;
    },

    async getStatistics(subscriptionId: bigint, userId: bigint) {
        logger.info(`get statistics for push subscription id: ${subscriptionId} for user: ${userId}`);

        // Get subscription
        const subscription = await db.select()
            .from(pushSubscriptions)
            .where(and(
                eq(pushSubscriptions.id, subscriptionId),
                eq(pushSubscriptions.userId, userId)
            ))
            .limit(1);

        if (subscription.length === 0) {
            throw new Error('Push subscription not found');
        }

        // Get logs
        const logs = await db.select()
            .from(pushNotificationLogs)
            .where(eq(pushNotificationLogs.subscriptionId, subscriptionId));

        const totalNotifications = logs.length;
        const sentNotifications = logs.filter(
            (log: any) => log.status === 'SENT',
        ).length;
        const failedNotifications = logs.filter(
            (log: any) => log.status === 'FAILED',
        ).length;
        const pendingNotifications = logs.filter(
            (log: any) => log.status === 'PENDING',
        ).length;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const last7DaysLogs = logs.filter(
            (log: any) => new Date(log.sentAt) >= sevenDaysAgo,
        );

        const statistics = {
            totalNotifications,
            sentNotifications,
            failedNotifications,
            pendingNotifications,
            successRate:
                totalNotifications > 0
                    ? (sentNotifications / totalNotifications) * 100
                    : 0,
            last7DaysCount: last7DaysLogs.length,
            lastUsed: subscription[0].lastUsedAt,
            isActive: subscription[0].isActive,
            createdAt: subscription[0].createdAt,
        };

        return {
            subscription: serializeModel(subscription[0], schema, hidden),
            statistics,
        };
    },

    query() {
        return db.select().from(pushSubscriptions);
    },

    serialize(subscription: any) {
        return serializeModel(subscription, schema, hidden);
    },

    serializeArray(subscriptionsData: any) {
        return subscriptionsData.map((subscription: any) =>
            serializeModel(subscription, schema, hidden),
        );
    },
};

