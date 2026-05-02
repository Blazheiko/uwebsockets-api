import { userOnlineRepository } from '#app/repositories/index.js';
import type { UserOnlineInsert } from '#app/repositories/index.js';

interface TrackConnectedInput {
    userId: bigint;
    sessionId: string;
    socketUuid: string;
    role: UserOnlineInsert['role'];
    typeApp: UserOnlineInsert['typeApp'];
    ipAddress: string;
    userAgent: string;
    connectedAt: Date;
    isFirstConnection: boolean;
}

interface TrackDisconnectedInput {
    socketUuid: string;
    disconnectedAt: Date;
    closeCode: number;
    connectionDurationMs: number;
    isLastConnection: boolean;
}

export const userOnlineService = {
    async trackConnected(input: TrackConnectedInput): Promise<void> {
        await userOnlineRepository.create({
            userId: input.userId,
            sessionId: input.sessionId,
            socketUuid: input.socketUuid,
            role: input.role,
            typeApp: input.typeApp,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            connectedAt: input.connectedAt,
            isFirstConnection: input.isFirstConnection,
        });
    },

    async trackDisconnected(input: TrackDisconnectedInput): Promise<void> {
        await userOnlineRepository.completeBySocketUuid(input.socketUuid, {
            disconnectedAt: input.disconnectedAt,
            closeCode: input.closeCode,
            connectionDurationMs: input.connectionDurationMs,
            isLastConnection: input.isLastConnection,
        });
    },
};
