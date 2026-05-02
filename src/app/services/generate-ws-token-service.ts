import { generateKey } from 'metautil';
import redis from '#database/redis.js';
import type { SessionInfo } from '#vendor/types/types.js';
import configApp from '#config/app.js';
import { isCanonicalEntityId } from '#vendor/utils/helpers/entity-id.js';

export async function generateWsToken(
    sessionInfo: SessionInfo,
    userId: string,
): Promise<string> {
    if (!isCanonicalEntityId(userId)) {
        return '';
    }

    const userToken = sessionInfo.data.userToken;
    if (userToken === undefined) {
        return '';
    }

    const wsToken = generateKey(configApp.characters, 16);
    await redis.setex(
        `auth:ws:${wsToken}`,
        60,
        JSON.stringify({
            sessionId: sessionInfo.id,
            userId,
            userToken,
        }),
    );

    return wsToken;
}
