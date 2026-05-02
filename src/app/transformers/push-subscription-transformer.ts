import { DateTime } from 'luxon';
import type {
    PushSubscriptionRow,
    PushSubscriptionWithLogs,
} from '#app/repositories/push-subscription-repository.js';

export type SerializedPushSubscription = Omit<
    PushSubscriptionRow,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
> & {
    id: string;
    userId: string;
    created_at: string | null;
    updated_at: string | null;
    lastUsedAt: string | null;
};

export type SerializedPushSubscriptionWithLogs = Omit<
    PushSubscriptionWithLogs,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
> & {
    id: string;
    userId: string;
    created_at: string | null;
    updated_at: string | null;
    lastUsedAt: string | null;
};

export const pushSubscriptionTransformer = {
    serialize(subscription: PushSubscriptionRow): SerializedPushSubscription {
        const { createdAt, updatedAt, lastUsedAt, id, userId, ...rest } = subscription;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            lastUsedAt: lastUsedAt !== null ? DateTime.fromJSDate(lastUsedAt).toISO() : null,
        };
    },

    serializeWithLogs(subscription: PushSubscriptionWithLogs): SerializedPushSubscriptionWithLogs {
        const { createdAt, updatedAt, lastUsedAt, id, userId, ...rest } = subscription;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            lastUsedAt: lastUsedAt !== null ? DateTime.fromJSDate(lastUsedAt).toISO() : null,
        };
    },

    serializeArray(subscriptions: PushSubscriptionRow[]): SerializedPushSubscription[] {
        return subscriptions.map((s) => pushSubscriptionTransformer.serialize(s));
    },

    serializeArrayWithLogs(
        subscriptions: PushSubscriptionWithLogs[],
    ): SerializedPushSubscriptionWithLogs[] {
        return subscriptions.map((s) => pushSubscriptionTransformer.serializeWithLogs(s));
    },
};
