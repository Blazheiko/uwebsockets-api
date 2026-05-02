import type {
    CreateSubscriptionInput,
    UpdateSubscriptionInput,
} from 'shared/schemas';
import { pushSubscriptionRepository } from '#app/repositories/index.js';
import { pushSubscriptionTransformer } from '#app/transformers/index.js';
import { failure, success, type ServiceResult } from '#app/services/shared/service-result.js';
import { getPushSubscriptionStatistics } from '#app/services/statistics/push-subscription-statistics-service.js';

export const pushSubscriptionService = {
    async getSubscriptions(
        userId: bigint,
    ): Promise<
        ServiceResult<{
            subscriptions: ReturnType<typeof pushSubscriptionTransformer.serializeArrayWithLogs>;
        }>
    > {
        const subscriptions = await pushSubscriptionRepository.findByUserIdWithLogs(userId);
        return success({
            subscriptions: pushSubscriptionTransformer.serializeArrayWithLogs(subscriptions),
        });
    },

    async createSubscription(
        userId: bigint,
        payload: CreateSubscriptionInput,
    ): Promise<ServiceResult<{ subscription: ReturnType<typeof pushSubscriptionTransformer.serialize> }>> {
        const existingSubscription = await pushSubscriptionRepository.findByEndpoint(
            payload.endpoint,
        );

        if (existingSubscription !== undefined) {
            const updated = await pushSubscriptionRepository.updateByEndpoint(
                payload.endpoint,
                userId,
                {
                    p256dhKey: payload.p256dhKey,
                    authKey: payload.authKey,
                    userAgent: payload.userAgent,
                    ipAddress: payload.ipAddress,
                    deviceType: payload.deviceType,
                    browserName: payload.browserName,
                    browserVersion: payload.browserVersion,
                    osName: payload.osName,
                    osVersion: payload.osVersion,
                    notificationTypes: payload.notificationTypes,
                    timezone: payload.timezone,
                    isActive: true,
                },
            );

            if (updated === undefined) {
                return failure('INTERNAL', 'Failed to update subscription');
            }

            return success({
                subscription: pushSubscriptionTransformer.serialize(updated),
            });
        }

        const created = await pushSubscriptionRepository.create({
            endpoint: payload.endpoint,
            p256dhKey: payload.p256dhKey,
            authKey: payload.authKey,
            userAgent: payload.userAgent ?? null,
            ipAddress: payload.ipAddress ?? null,
            deviceType: payload.deviceType ?? null,
            browserName: payload.browserName ?? null,
            browserVersion: payload.browserVersion ?? null,
            osName: payload.osName ?? null,
            osVersion: payload.osVersion ?? null,
            notificationTypes: payload.notificationTypes,
            timezone: payload.timezone ?? null,
            userId,
        });

        return success({ subscription: pushSubscriptionTransformer.serialize(created) });
    },

    async getSubscription(
        userId: bigint,
        subscriptionId: bigint,
    ): Promise<ServiceResult<{ data: Record<string, unknown> }>> {
        const [subscription, logs] = await Promise.all([
            pushSubscriptionRepository.findByIdAndUserId(subscriptionId, userId),
            pushSubscriptionRepository.getLogsBySubscriptionId(subscriptionId, userId, 10),
        ]);

        if (subscription === undefined) {
            return failure('NOT_FOUND', 'Subscription not found');
        }

        return success({
            data: {
                ...pushSubscriptionTransformer.serialize(subscription),
                notificationLogs: logs,
            },
        });
    },

    async updateSubscription(
        userId: bigint,
        subscriptionId: bigint,
        payload: UpdateSubscriptionInput,
    ): Promise<ServiceResult<{ subscription: ReturnType<typeof pushSubscriptionTransformer.serialize> }>> {
        const updateData = {
            ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
            ...(payload.notificationTypes !== undefined
                ? { notificationTypes: payload.notificationTypes }
                : {}),
            ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
            ...(payload.deviceType !== undefined ? { deviceType: payload.deviceType } : {}),
            ...(payload.browserName !== undefined ? { browserName: payload.browserName } : {}),
            ...(payload.browserVersion !== undefined
                ? { browserVersion: payload.browserVersion }
                : {}),
            ...(payload.osName !== undefined ? { osName: payload.osName } : {}),
            ...(payload.osVersion !== undefined ? { osVersion: payload.osVersion } : {}),
        };

        const updated = await pushSubscriptionRepository.update(
            subscriptionId,
            userId,
            updateData,
        );

        if (updated === undefined) {
            return failure('NOT_FOUND', 'Subscription not found');
        }

        return success({ subscription: pushSubscriptionTransformer.serialize(updated) });
    },

    async deleteSubscription(
        userId: bigint,
        subscriptionId: bigint,
    ): Promise<ServiceResult<{ message: string }>> {
        const deleted = await pushSubscriptionRepository.delete(subscriptionId, userId);
        if (!deleted) {
            return failure('NOT_FOUND', 'Subscription not found');
        }

        return success({ message: 'Subscription deleted successfully' });
    },

    async getSubscriptionLogs(
        userId: bigint,
        subscriptionId: bigint,
    ): Promise<ServiceResult<{ data: Awaited<ReturnType<typeof pushSubscriptionRepository.getLogsBySubscriptionId>> }>> {
        const logs = await pushSubscriptionRepository.getLogsBySubscriptionId(
            subscriptionId,
            userId,
            50,
        );
        return success({ data: logs });
    },

    async getSubscriptionStatistics(
        userId: bigint,
        subscriptionId: bigint,
    ): Promise<ServiceResult<{ data: NonNullable<Awaited<ReturnType<typeof getPushSubscriptionStatistics>>> }>> {
        const data = await getPushSubscriptionStatistics(subscriptionId, userId);
        if (data === undefined) {
            return failure('NOT_FOUND', 'Subscription not found');
        }

        return success({ data });
    },

    async deactivateSubscription(
        userId: bigint,
        subscriptionId: bigint,
    ): Promise<ServiceResult<{ data: ReturnType<typeof pushSubscriptionTransformer.serialize> }>> {
        const deactivated = await pushSubscriptionRepository.deactivate(subscriptionId, userId);
        if (deactivated === undefined) {
            return failure('NOT_FOUND', 'Subscription not found');
        }

        return success({ data: pushSubscriptionTransformer.serialize(deactivated) });
    },
};
