import logger from '#logger';
import crypto from 'node:crypto';
import appConfig from '#config/app.js';

const SECRET_KEY = appConfig.key || '';

// CRITICAL: Validate SECRET_KEY on application startup
if (!SECRET_KEY || SECRET_KEY.length < 32) {
    logger.error(
        'SECURITY ERROR: APP_KEY is not set or too short (minimum 32 characters required)',
    );
    logger.error('Please set a strong APP_KEY in your environment variables');
    logger.error('Example: APP_KEY=$(openssl rand -hex 32)');
    throw new Error(
        'APP_KEY must be set and at least 32 characters long for security',
    );
}

if (SECRET_KEY === 'your-secret-key' || SECRET_KEY === 'change-me') {
    logger.error('SECURITY ERROR: APP_KEY is using default/weak value');
    throw new Error('APP_KEY must be changed from default value');
}

logger.info('✓ APP_KEY validation passed');

const SIGNATURE_LENGTH = 32;

const createSignature = (data: string): string => {
    return crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex')
        .substring(0, SIGNATURE_LENGTH);
};

const createSignedToken = (data: string): string => {
    const signature = createSignature(data);
    const signedToken = `${data}.${signature}`;
    return Buffer.from(signedToken).toString('base64');
};

const verifySignature = (data: string, signature: string): boolean => {
    try {
        const expectedSignature = createSignature(data);

        if (signature.length !== expectedSignature.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex'),
        );
    } catch (error) {
        return false;
    }
};

const verifySignedToken = (
    token: string,
): { cookieUserId: string; sessionId: string } | null => {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split('.');

        if (parts.length !== 3) {
            logger.warn('Invalid token format: expected 3 parts');
            return null;
        }

        const [cookieUserId, sessionId, signature] = parts;

        if (!verifySignature(`${cookieUserId}.${sessionId}`, signature)) {
            logger.warn(
                { cookieUserId, sessionId, signature },
                `cookieUserId: ${cookieUserId} Invalid token signature`,
            );
            return null;
        }

        return { cookieUserId, sessionId };
    } catch (error) {
        logger.error({ err: error }, 'Token verification error:');
        return null;
    }
};

export { createSignedToken, verifySignedToken };
