import { pushSubscriptionRepository } from '#app/repositories/index.js';
import { pushSubscriptionTransformer } from '#app/transformers/index.js';
import type { SerializedPushSubscription } from '#app/transformers/push-subscription-transformer.js';
import { db } from '#database/db.js';
import { pushNotificationLogs } from '#database/schema.js';
import { eq } from 'drizzle-orm';

export interface PushSubscriptionStatistics {
    totalNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    pendingNotifications: number;
    successRate: number;
    last7DaysCount: number;
    lastUsed: Date | null;
    isActive: boolean;
    createdAt: Date;
}

export interface PushSubscriptionStatisticsResult {
    subscription: SerializedPushSubscription;
    statistics: PushSubscriptionStatistics;
}

export async function getPushSubscriptionStatistics(
    subscriptionId: bigint,
    userId: bigint,
): Promise<PushSubscriptionStatisticsResult | undefined> {
    const subscription = await pushSubscriptionRepository.findByIdAndUserId(
        subscriptionId,
        userId,
    );
    if (subscription === undefined) {
        return undefined;
    }

    const logs = await db
        .select()
        .from(pushNotificationLogs)
        .where(eq(pushNotificationLogs.subscriptionId, subscriptionId));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const totalNotifications = logs.length;
    const sentNotifications = logs.filter((l) => l.status === 'SENT').length;
    const failedNotifications = logs.filter((l) => l.status === 'FAILED').length;
    const pendingNotifications = logs.filter((l) => l.status === 'PENDING').length;
    const last7DaysCount = logs.filter((l) => l.sentAt >= sevenDaysAgo).length;

    return {
        subscription: pushSubscriptionTransformer.serialize(subscription),
        statistics: {
            totalNotifications,
            sentNotifications,
            failedNotifications,
            pendingNotifications,
            successRate:
                totalNotifications > 0 ? (sentNotifications / totalNotifications) * 100 : 0,
            last7DaysCount,
            lastUsed: subscription.lastUsedAt,
            isActive: subscription.isActive,
            createdAt: subscription.createdAt,
        },
    };
}
