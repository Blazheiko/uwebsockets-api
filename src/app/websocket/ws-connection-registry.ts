import type { MyWebSocket } from '#vendor/types/types.js';

interface UserConnections {
    ip: string;
    userAgent: string;
    appType: 'web' | 'pwa';
    connections: Map<string, MyWebSocket>;
}

type UserStorage = Map<string, UserConnections>;

const userStorage: UserStorage = new Map<string, UserConnections>();

export interface ConnectionMeta {
    ip: string;
    userAgent: string;
    appType: 'web' | 'pwa';
}

function summarizeAppType(connections: Iterable<MyWebSocket>): 'web' | 'pwa' {
    for (const ws of connections) {
        if (ws.getUserData().appType === 'pwa') {
            return 'pwa';
        }
    }

    return 'web';
}

/**
 * Registers a new WS connection for a user.
 * Returns true if this is the user's first connection (no prior active connections).
 */
const registerConnection = (
    userId: string,
    uuid: string,
    ws: MyWebSocket,
    meta: ConnectionMeta,
): boolean => {
    const existing = userStorage.get(userId);
    if (existing !== undefined) {
        existing.connections.set(uuid, ws);
        existing.userAgent = meta.userAgent;
        existing.ip = meta.ip;
        existing.appType = summarizeAppType(existing.connections.values());
        return false;
    }
    userStorage.set(userId, {
        ip: meta.ip,
        userAgent: meta.userAgent,
        appType: meta.appType,
        connections: new Map([[uuid, ws]]),
    });
    return true;
};

/**
 * Unregisters a WS connection for a user.
 * Returns true if this was the user's last connection (no remaining active connections).
 */
const unregisterConnection = (userId: string, uuid: string): boolean => {
    const existing = userStorage.get(userId);
    if (existing === undefined) return false;
    existing.connections.delete(uuid);
    if (existing.connections.size === 0) {
        userStorage.delete(userId);
        return true;
    }
    existing.appType = summarizeAppType(existing.connections.values());

    return false;
};

const isUserOnline = (userId: string): boolean => userStorage.has(userId);

const findOnlineUsers = (userIds: string[]): string[] => {
    const online: string[] = [];
    for (const id of userIds) {
        if (userStorage.has(id)) online.push(id);
    }
    return online;
};

const forEachConnection = (
    userId: string,
    fn: (ws: MyWebSocket, uuid: string) => void,
): void => {
    const user = userStorage.get(userId);
    if (user === undefined) return;
    for (const [uuid, ws] of user.connections) {
        fn(ws, uuid);
    }
};

const getConnection = (userId: string, uuid: string): MyWebSocket | undefined =>
    userStorage.get(userId)?.connections.get(uuid);

const getOnlineUsers = (): {
    userId: string;
    ip: string;
    userAgent: string;
    appType: 'web' | 'pwa';
    connectionsCount: number;
}[] => Array.from(userStorage.entries()).map(([userId, user]) => ({
    userId,
    ip: user.ip,
    userAgent: user.userAgent,
    appType: user.appType,
    connectionsCount: user.connections.size,
}));

const getOnlineUserMeta = (userId: string): {
    ip: string;
    userAgent: string;
    appType: 'web' | 'pwa';
    connectionsCount: number;
    connections: {
        uuid: string;
        ip: string;
        userAgent: string;
        appType: 'web' | 'pwa';
    }[];
} | undefined => {
    const user = userStorage.get(userId);
    if (user === undefined) return undefined;
    return {
        ip: user.ip,
        userAgent: user.userAgent,
        appType: user.appType,
        connectionsCount: user.connections.size,
        connections: Array.from(user.connections.entries()).map(([uuid, ws]) => {
            const userData = ws.getUserData();
            return {
                uuid,
                ip: userData.ip,
                userAgent: userData.userAgent,
                appType: userData.appType,
            };
        }),
    };
};

export const wsConnectionRegistry = {
    registerConnection,
    unregisterConnection,
    isUserOnline,
    findOnlineUsers,
    forEachConnection,
    getConnection,
    getOnlineUsers,
    getOnlineUserMeta,
};
