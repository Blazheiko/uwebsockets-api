import { HttpContext } from '../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';
import { PushNotificationStatus } from '@prisma/client';

export default {
    async getSubscriptions(context: HttpContext) {
        const { auth, logger, responseData } = context;
        logger.info('getSubscriptions handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const subscriptions = await prisma.pushSubscription.findMany({
                where: { userId },
                include: {
                    notificationLogs: {
                        select: {
                            id: true,
                            messageTitle: true,
                            status: true,
                            sentAt: true,
                        },
                        orderBy: { sentAt: 'desc' },
                        take: 5,
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return { status: 'success', subscriptions };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscriptions:');
            return { status: 'error', message: 'Failed to get subscriptions' };
        }
    },

    async createSubscription(context: HttpContext) {
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
            const existingSubscription =
                await prisma.pushSubscription.findUnique({
                    where: { endpoint },
                });

            if (existingSubscription) {
                // Update existing subscription
                const updatedSubscription =
                    await prisma.pushSubscription.update({
                        where: { endpoint },
                        data: {
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
                        },
                    });
                return { status: 'success', subscription: updatedSubscription };
            }

            const subscription = await prisma.pushSubscription.create({
                data: {
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
                    lastUsedAt: new Date(),
                },
            });
            return { status: 'success', subscription };
        } catch (error) {
            logger.error({ err: error }, 'Error creating subscription:');
            return {
                status: 'error',
                message: 'Failed to create subscription',
            };
        }
    },

    async getSubscription(context: HttpContext) {
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
            const subscription = await prisma.pushSubscription.findFirst({
                where: {
                    id: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
                include: {
                    notificationLogs: {
                        orderBy: { sentAt: 'desc' },
                        take: 10,
                    },
                },
            });

            if (!subscription) {
                return { status: 'error', message: 'Subscription not found' };
            }

            return { status: 'success', data: subscription };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscription:');
            return { status: 'error', message: 'Failed to get subscription' };
        }
    },

    async updateSubscription(context: HttpContext) {
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
            const updateData: any = {};
            if (isActive !== undefined) updateData.isActive = isActive;
            if (notificationTypes !== undefined)
                updateData.notificationTypes = notificationTypes;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (deviceType !== undefined) updateData.deviceType = deviceType;
            if (browserName !== undefined) updateData.browserName = browserName;
            if (browserVersion !== undefined)
                updateData.browserVersion = browserVersion;
            if (osName !== undefined) updateData.osName = osName;
            if (osVersion !== undefined) updateData.osVersion = osVersion;
            updateData.lastUsedAt = new Date();

            const subscription = await prisma.pushSubscription.updateMany({
                where: {
                    id: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
                data: updateData,
            });

            if (subscription.count === 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const updatedSubscription =
                await prisma.pushSubscription.findUnique({
                    where: { id: parseInt(subscriptionId) },
                });

            return { status: 'success', subscription: updatedSubscription };
        } catch (error) {
            logger.error({ err: error }, 'Error updating subscription:');
            return {
                status: 'error',
                message: 'Failed to update subscription',
            };
        }
    },

    async deleteSubscription(context: HttpContext) {
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
            const deleted = await prisma.pushSubscription.deleteMany({
                where: {
                    id: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
            });

            if (deleted.count === 0) {
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

    async getSubscriptionLogs(context: HttpContext) {
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
            const logs = await prisma.pushNotificationLog.findMany({
                where: {
                    subscriptionId: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
                orderBy: { sentAt: 'desc' },
                take: 50,
            });

            return { status: 'success', data: logs };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subscription logs:');
            return {
                status: 'error',
                message: 'Failed to get subscription logs',
            };
        }
    },

    async getSubscriptionStatistics(context: HttpContext) {
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
            const subscription = await prisma.pushSubscription.findFirst({
                where: {
                    id: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
                include: {
                    notificationLogs: true,
                },
            });

            if (!subscription) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const logs = subscription.notificationLogs;
            const totalNotifications = logs.length;
            const sentNotifications = logs.filter(
                (log) => log.status === PushNotificationStatus.SENT,
            ).length;
            const failedNotifications = logs.filter(
                (log) => log.status === PushNotificationStatus.FAILED,
            ).length;
            const pendingNotifications = logs.filter(
                (log) => log.status === PushNotificationStatus.PENDING,
            ).length;

            const last7DaysLogs = logs.filter(
                (log) =>
                    new Date(log.sentAt) >=
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
                lastUsed: subscription.lastUsedAt,
                isActive: subscription.isActive,
                createdAt: subscription.createdAt,
            };

            return { status: 'success', data: { subscription, statistics } };
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

    async deactivateSubscription(context: HttpContext) {
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
            const subscription = await prisma.pushSubscription.updateMany({
                where: {
                    id: parseInt(subscriptionId),
                    userId: auth.getUserId(),
                },
                data: {
                    isActive: false,
                },
            });

            if (subscription.count === 0) {
                return { status: 'error', message: 'Subscription not found' };
            }

            const deactivatedSubscription =
                await prisma.pushSubscription.findUnique({
                    where: { id: parseInt(subscriptionId) },
                });

            return { status: 'success', data: deactivatedSubscription };
        } catch (error) {
            logger.error({ err: error }, 'Error deactivating subscription:');
            return {
                status: 'error',
                message: 'Failed to deactivate subscription',
            };
        }
    },
};
