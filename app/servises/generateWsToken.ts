import { generateKey } from 'metautil';
import redis from '#database/redis.js';
import { SessionInfo } from '../../vendor/types/types.js';
import configApp from '#config/app.js';

export default async (sessionInfo: SessionInfo, userId: number | bigint) => {
    let wsToken = ''
    const userIdNumber = Number(userId);
    if(sessionInfo && userIdNumber) {
        wsToken = generateKey(configApp.characters, 16);
        await redis.setex(
            `auth:ws:${wsToken}`,
            60,
            JSON.stringify({
                sessionId: sessionInfo.id,
                userId: `${ userIdNumber }`,
            }),
        );
    }

    return wsToken;
}
