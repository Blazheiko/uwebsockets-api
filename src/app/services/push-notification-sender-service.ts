import webpush from 'web-push';
import pushConfig from '#config/push.js';
import logger from '#logger';
import { pushSubscriptionRepository } from '#app/repositories/index.js';
import { db } from '#database/db.js';
import { pushNotificationLogs } from '#database/schema.js';
import { wsConnectionRegistry } from '#app/websocket/ws-connection-registry.js';

export interface PushNotificationPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
    data?: Record<string, unknown>;
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;

    if (pushConfig.vapidPublicKey === '' || pushConfig.vapidPrivateKey === '') {
        logger.warn('VAPID keys not configured — push notifications disabled');
        return false;
    }

    try {
        webpush.setVapidDetails(
            pushConfig.vapidSubject,
            pushConfig.vapidPublicKey,
            pushConfig.vapidPrivateKey,
        );
        vapidConfigured = true;
        return true;
    } catch (error) {
        logger.error({ err: error }, 'Failed to set VAPID details');
        return false;
    }
}

function isUserOnline(userId: string): boolean {
    return wsConnectionRegistry.isUserOnline(userId);
}

export const pushNotificationSenderService = {
    isConfigured(): boolean {
        return ensureVapidConfigured();
    },

    getVapidPublicKey(): string {
        return pushConfig.vapidPublicKey;
    },

    async sendToUser(
        userId: bigint,
        payload: PushNotificationPayload,
        options: { skipIfOnline?: boolean; notificationType?: string } = {},
    ): Promise<{ sent: number; failed: number }> {
        if (!ensureVapidConfigured()) {
            return { sent: 0, failed: 0 };
        }

        // Skip if user is online and option is set
        if (options.skipIfOnline === true && isUserOnline(String(userId))) {
            logger.info({ userId: String(userId) }, 'User is online, skipping push notification');
            return { sent: 0, failed: 0 };
        }

        const subscriptions = await pushSubscriptionRepository.findByUserId(userId);
        const activeSubscriptions = subscriptions.filter((sub) => sub.isActive);

        if (activeSubscriptions.length === 0) {
            return { sent: 0, failed: 0 };
        }

        let sent = 0;
        let failed = 0;

        const pushPayload = JSON.stringify({
            notification: {
                title: payload.title,
                body: payload.body,
                icon: payload.icon ?? '/icons/icon_192x192.png',
                badge: '/icons/badge-72.png',
                vibrate: [200, 100, 200],
                data: {
                    url: payload.url ?? '/',
                    ...payload.data,
                },
                tag: payload.tag,
                actions: [
                    { action: 'open', title: 'Open' },
                    { action: 'close', title: 'Close' },
                ],
            },
        });

        for (const subscription of activeSubscriptions) {
            // Filter by notificationType if subscription has preferences
            if (
                options.notificationType !== undefined &&
                Array.isArray(subscription.notificationTypes) &&
                (subscription.notificationTypes as string[]).length > 0 &&
                !(subscription.notificationTypes as string[]).includes(options.notificationType)
            ) {
                continue;
            }

            try {
                const response = await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dhKey,
                            auth: subscription.authKey,
                        },
                    },
                    pushPayload,
                );

                // Log success
                await db.insert(pushNotificationLogs).values({
                    userId,
                    subscriptionId: subscription.id,
                    messageTitle: payload.title,
                    messageBody: payload.body,
                    messageData: payload.data ?? null,
                    status: 'SENT',
                    responseData: { statusCode: response.statusCode },
                    sentAt: new Date(),
                });

                // Update last used
                await pushSubscriptionRepository.update(subscription.id, userId, {});

                sent++;
            } catch (error: unknown) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                const errorMessage = error instanceof Error ? error.message : String(error);

                // 410 Gone or 404 — subscription expired, deactivate
                if (statusCode === 410 || statusCode === 404) {
                    logger.info(
                        { subscriptionId: String(subscription.id), statusCode },
                        'Push subscription expired, deactivating',
                    );
                    await pushSubscriptionRepository.deactivate(subscription.id, userId);
                }

                // Log failure
                await db.insert(pushNotificationLogs).values({
                    userId,
                    subscriptionId: subscription.id,
                    messageTitle: payload.title,
                    messageBody: payload.body,
                    messageData: payload.data ?? null,
                    status: 'FAILED',
                    errorMessage,
                    responseData: { statusCode: statusCode ?? null },
                    sentAt: new Date(),
                });

                logger.error(
                    { err: error, subscriptionId: String(subscription.id) },
                    'Failed to send push notification',
                );

                failed++;
            }
        }

        return { sent, failed };
    },
};
