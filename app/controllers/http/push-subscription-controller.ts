import { HttpContext } from '../../../vendor/types/types.js';
import PushSubscription from '#app/models/push-subscription.js';
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
            const subscriptionsWithLogs = await PushSubscription.findByUserIdWithLogs(userId);

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
            const existingSubscription = await PushSubscription.findByEndpoint(endpoint);

            if (existingSubscription) {
                // Update existing subscription
                const updatedSubscription = await PushSubscription.updateByEndpoint(endpoint, auth.getUserId(), {
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
                });

                return { status: 'success', subscription: updatedSubscription };
            }

            const createdSubscription = await PushSubscription.create({
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
            });

            return { status: 'success', subscription: createdSubscription };
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
            const subscription = await PushSubscription.findById(BigInt(subscriptionId), auth.getUserId());
            const logs = await PushSubscription.getLogsBySubscriptionId(BigInt(subscriptionId), auth.getUserId(), 10);

            return { status: 'success', data: { ...subscription, notificationLogs: logs } };
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
            const updatedSubscription = await PushSubscription.update(
                BigInt(subscriptionId),
                auth.getUserId(),
                {
                    isActive,
                    notificationTypes,
                    timezone,
                    deviceType,
                    browserName,
                    browserVersion,
                    osName,
                    osVersion,
                }
            );

            return { status: 'success', subscription: updatedSubscription };
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
            await PushSubscription.delete(BigInt(subscriptionId), auth.getUserId());

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
            const logs = await PushSubscription.getLogsBySubscriptionId(
                BigInt(subscriptionId),
                auth.getUserId(),
                50
            );

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
            const result = await PushSubscription.getStatistics(
                BigInt(subscriptionId),
                auth.getUserId()
            );

            return { status: 'success', data: result };
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
            const deactivatedSubscription = await PushSubscription.deactivate(
                BigInt(subscriptionId),
                auth.getUserId()
            );

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
