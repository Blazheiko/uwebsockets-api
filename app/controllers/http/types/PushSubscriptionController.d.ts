/**
 * Response types for PushSubscriptionController
 */

export interface PushSubscription {
    id: number;
    userId: number;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PushSubscriptionLog {
    id: number;
    subscriptionId: number;
    status: string;
    message?: string;
    createdAt: string;
}

export interface GetSubscriptionsResponse {
    status: 'ok';
    subscriptions: PushSubscription[];
}

export interface CreateSubscriptionResponse {
    status: 'ok' | 'error';
    message?: string;
    subscription?: PushSubscription;
}

export interface GetSubscriptionResponse {
    status: 'ok' | 'error';
    message?: string;
    subscription?: PushSubscription;
}

export interface UpdateSubscriptionResponse {
    status: 'ok' | 'error';
    message?: string;
    subscription?: PushSubscription;
}

export interface DeleteSubscriptionResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface GetSubscriptionLogsResponse {
    status: 'ok';
    logs: PushSubscriptionLog[];
}

export interface GetSubscriptionStatisticsResponse {
    status: 'ok';
    statistics: {
        totalSent: number;
        successfulSent: number;
        failedSent: number;
    };
}

export interface DeactivateSubscriptionResponse {
    status: 'ok' | 'error';
    message?: string;
    subscription?: PushSubscription;
}
