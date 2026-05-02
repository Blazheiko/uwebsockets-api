import { env } from 'node:process';

const config = Object.freeze({
    vapidPublicKey: env['VAPID_PUBLIC_KEY'] ?? '',
    vapidPrivateKey: env['VAPID_PRIVATE_KEY'] ?? '',
    vapidSubject: env['VAPID_SUBJECT'] ?? 'mailto:admin@itvibe.party',
});

export default config;
