import { generateKey } from 'metautil';
import redis from '#database/redis.js';
import { SessionInfo } from '../../vendor/types/types.js';
import configApp from '#config/app.js';

export default async (sessionInfo: SessionInfo, userId: number) => {
    let wsToken = ''
    if(sessionInfo && userId) {
        wsToken = generateKey(configApp.characters, 16);
        await redis.setex(
            `auth:ws:${wsToken}`,
            60,
            JSON.stringify({ sessionId: sessionInfo.id, userId }),
        );
    }

    return wsToken;
}