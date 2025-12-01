import { HttpContext } from '../../../vendor/types/types.js';
import { db } from '#database/db.js';
import { pushSubscriptions, pushNotificationLogs } from '#database/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import type {
    GetSubscriptionsResponse,
    CreateSubscriptionResponse,
    GetSubscriptionResponse,
    UpdateSubscriptionResponse,
    DeleteSubscriptionResponse,
    GetSubscriptionLogsResponse,
    GetSubscriptionStatisticsResponse,
    DeactivateSubscriptionResponse,
} from '../types/PushSubscriptionController.js';

export default {
    async getSubscriptions(
        context: HttpContext,
    ): Promise<GetSubscriptionsResponse> {
        const { auth, logger, responseData } = context;
        logger.info('getSubscriptions handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
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

            return { status: 'success', subscriptions: subscriptionsWithLogs };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscriptions:');
            return { status: 'error', message: 'Failed to get subscriptions' };
        }
    },

    async createSubscription(
        context: HttpContext,
    ): Promise<CreateSubscriptionResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('createSubscription handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const {
            endpoint,
            p256dhKey,
            authKey,
            userAgent,
            ipAddress,
            deviceType,
            browserName,
            browserVersion,
            osName,
            osVersion,
            notificationTypes,
            timezone,
        } = httpData.payload;

        try {
            // Check if subscription already exists for this endpoint
            const existingSubscription = await db.select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.endpoint, endpoint))
                .limit(1);

            if (existingSubscription.length > 0) {
                // Update existing subscription
                await db.update(pushSubscriptions)
                    .set({
                        p256dhKey,
                        authKey,
                        userAgent,
                        ipAddress,
                        deviceType,
                        browserName,
                        browserVersion,
                        osName,
                        osVersion,
                        notificationTypes,
                        timezone,
                        isActive: true,
                        lastUsedAt: new Date(),
                        userId: auth.getUserId(),
                    })
                    .where(eq(pushSubscriptions.endpoint, endpoint));

                const updatedSubscription = await db.select()
                    .from(pushSubscriptions)
                    .where(eq(pushSubscriptions.endpoint, endpoint))
                    .limit(1);

                return { status: 'success', subscription: updatedSubscription[0] };
            }

            const now = new Date();
            const [subscription] = await db.insert(pushSubscriptions).values({
                endpoint,
                p256dhKey,
                authKey,
                userAgent,
                ipAddress,
                deviceType,
                browserName,
                browserVersion,
                osName,
                osVersion,
                notificationTypes,
                timezone,
                userId: auth.getUserId(),
                lastUsedAt: now,
                createdAt: now,
                updatedAt: now,
            });

            const createdSubscription = await db.select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.id, BigInt(subscription.insertId)))
                .limit(1);

            return { status: 'success', subscription: createdSubscription[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error creating subscription:');
            return {
                status: 'error',
                message: 'Failed to create subscription',
            };
        }
    },

    async getSubscription(
        context: HttpContext,
    ): Promise<GetSubscriptionResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getSubscription handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };

        try {
            const subscription = await db.select()
                .from(pushSubscriptions)
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ))
                .limit(1);

            if (subscription.length === 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const logs = await db.select()
                .from(pushNotificationLogs)
                .where(eq(pushNotificationLogs.subscriptionId, BigInt(subscriptionId)))
                .orderBy(desc(pushNotificationLogs.sentAt))
                .limit(10);

            return { status: 'success', data: { ...subscription[0], notificationLogs: logs } };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscription:');
            return { status: 'error', message: 'Failed to get subscription' };
        }
    },

    async updateSubscription(
        context: HttpContext,
    ): Promise<UpdateSubscriptionResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('updateSubscription handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };
        const {
            isActive,
            notificationTypes,
            timezone,
            deviceType,
            browserName,
            browserVersion,
            osName,
            osVersion,
        } = httpData.payload;

        try {
            const updateData: any = { lastUsedAt: new Date() };
            if (isActive !== undefined) updateData.isActive = isActive;
            if (notificationTypes !== undefined) updateData.notificationTypes = notificationTypes;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (deviceType !== undefined) updateData.deviceType = deviceType;
            if (browserName !== undefined) updateData.browserName = browserName;
            if (browserVersion !== undefined) updateData.browserVersion = browserVersion;
            if (osName !== undefined) updateData.osName = osName;
            if (osVersion !== undefined) updateData.osVersion = osVersion;

            await db.update(pushSubscriptions)
                .set(updateData)
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ));

            const updatedSubscription = await db.select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.id, BigInt(subscriptionId)))
                .limit(1);

            return { status: 'success', subscription: updatedSubscription[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error updating subscription:');
            return {
                status: 'error',
                message: 'Failed to update subscription',
            };
        }
    },

    async deleteSubscription(
        context: HttpContext,
    ): Promise<DeleteSubscriptionResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('deleteSubscription handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };

        try {
            const deleted = await db.delete(pushSubscriptions)
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ));

            // For MySQL, check if deletion was successful differently
            // deleted is the result, but we need to check the actual deletion
            const checkDeleted = await db.select({ count: sql<number>`count(*)` })
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.id, BigInt(subscriptionId)));
            
            if (checkDeleted[0]?.count > 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            return {
                status: 'success',
                message: 'Subscription deleted successfully',
            };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting subscription:');
            return {
                status: 'error',
                message: 'Failed to delete subscription',
            };
        }
    },

    async getSubscriptionLogs(
        context: HttpContext,
    ): Promise<GetSubscriptionLogsResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getSubscriptionLogs handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };

        try {
            const logs = await db.select()
                .from(pushNotificationLogs)
                .where(and(
                    eq(pushNotificationLogs.subscriptionId, BigInt(subscriptionId)),
                    eq(pushNotificationLogs.userId, auth.getUserId())
                ))
                .orderBy(desc(pushNotificationLogs.sentAt))
                .limit(50);

            return { status: 'success', data: logs };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscription logs:');
            return {
                status: 'error',
                message: 'Failed to get subscription logs',
            };
        }
    },

    async getSubscriptionStatistics(
        context: HttpContext,
    ): Promise<GetSubscriptionStatisticsResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getSubscriptionStatistics handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };

        try {
            const subscription = await db.select()
                .from(pushSubscriptions)
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ))
                .limit(1);

            if (subscription.length === 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const logs = await db.select()
                .from(pushNotificationLogs)
                .where(eq(pushNotificationLogs.subscriptionId, BigInt(subscriptionId)));

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

            return { status: 'success', data: { subscription: subscription[0], statistics } };
        } catch (error) {
            logger.error(
                { err: error },
                'Error getting subscription statistics:',
            );
            return {
                status: 'error',
                message: 'Failed to get subscription statistics',
            };
        }
    },

    async deactivateSubscription(
        context: HttpContext,
    ): Promise<DeactivateSubscriptionResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('deactivateSubscription handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { subscriptionId } = httpData.params as {
            subscriptionId: string;
        };

        try {
            await db.update(pushSubscriptions)
                .set({ isActive: false })
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ));

            // Verify update was successful
            const checkResult = await db.select({ count: sql<number>`count(*)` })
                .from(pushSubscriptions)
                .where(and(
                    eq(pushSubscriptions.id, BigInt(subscriptionId)),
                    eq(pushSubscriptions.userId, auth.getUserId())
                ));

            if (checkResult[0]?.count === 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const deactivatedSubscription = await db.select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.id, BigInt(subscriptionId)))
                .limit(1);

            return { status: 'success', data: deactivatedSubscription[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error deactivating subscription:');
            return {
                status: 'error',
                message: 'Failed to deactivate subscription',
            };
        }
    },
};
