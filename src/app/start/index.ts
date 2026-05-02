// This file automatically imports all initialization files
// Add new initialization files here to execute them on startup

import { registerWsAppHooks } from '#vendor/utils/network/ws-handlers.js';
import { websocketCoordinator } from '#app/websocket/ws-coordinator.js';
import { wsSessionAuth } from '#app/websocket/ws-session-auth.js';

registerWsAppHooks({
    onUpgrade:      (token) => wsSessionAuth.verifyUpgradeToken(token),
    onConnected:    (ws, userData) => websocketCoordinator.handleConnected(ws, userData),
    onDisconnected: (ws, userData, code) => websocketCoordinator.handleDisconnected(ws, userData, code),
    onRefreshToken: (token) => wsSessionAuth.refreshToken(token),
    onRevokeToken:  (token) => wsSessionAuth.revokeToken(token),
});
