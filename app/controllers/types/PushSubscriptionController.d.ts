/**
 * Response types for PushSubscriptionController
 */

export interface PushSubscription {
    id: bigint;
    userId: bigint;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    userAgent: string | null;
    ipAddress: string | null;
    deviceType: string | null;
    browserName: string | null;
    browserVersion: string | null;
    osName: string | null;
    osVersion: string | null;
    notificationTypes: any;
    timezone: string | null;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    notificationLogs?: PushSubscriptionLog[] | PushSubscriptionLogSummary[];
}

export interface PushSubscriptionLog {
    id: bigint;
    subscriptionId?: bigint | null;
    userId?: bigint | null;
    status: string | null;
    errorMessage?: string | null;
    messageTitle?: string | null;
    messageBody?: string | null;
    messageData?: any;
    responseData?: any;
    sentAt: Date;
}

export interface PushSubscriptionLogSummary {
    id: bigint;
    messageTitle: string | null;
    status: string | null;
    sentAt: Date;
}

export interface GetSubscriptionsResponse {
    status: 'success' | 'error';
    message?: string;
    subscriptions?: PushSubscription[];
}

export interface CreateSubscriptionResponse {
    status: 'success' | 'error';
    message?: string;
    subscription?: PushSubscription;
}

export interface GetSubscriptionResponse {
    status: 'success' | 'error';
    message?: string;
    data?: PushSubscription | null;
}

export interface UpdateSubscriptionResponse {
    status: 'success' | 'error';
    message?: string;
    subscription?: PushSubscription | null;
}

export interface DeleteSubscriptionResponse {
    status: 'success' | 'error';
    message?: string;
}

export interface GetSubscriptionLogsResponse {
    status: 'success' | 'error';
    message?: string;
    data?: PushSubscriptionLog[];
}

export interface GetSubscriptionStatisticsResponse {
    status: 'success' | 'error';
    message?: string;
    data?: {
        subscription: PushSubscription;
        statistics: any;
    };
}

export interface DeactivateSubscriptionResponse {
    status: 'success' | 'error';
    message?: string;
    data?: PushSubscription | null;
}
