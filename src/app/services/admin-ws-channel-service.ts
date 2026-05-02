import type { MyWebSocket, UserConnection } from "#vendor/types/types.js";

const ADMIN_CHANNEL = "admin";
let adminSubscriberCount = 0;

function getUserData(ws: MyWebSocket): UserConnection {
  return ws.getUserData();
}

export const adminWsChannelService = {
  subscribeCurrentAdminConnection(ws: MyWebSocket): { ok: true } | { ok: false; message: string } {
    const userData = getUserData(ws);
    if (userData.role !== "admin") {
      return { ok: false, message: "Access denied" };
    }

    if (userData.isAdminChannelSubscribed === true) {
      return { ok: true };
    }

    ws.subscribe(ADMIN_CHANNEL);
    userData.isAdminChannelSubscribed = true;
    adminSubscriberCount += 1;
    return { ok: true };
  },

  unsubscribeCurrentAdminConnection(ws: MyWebSocket): { ok: true } {
    const userData = getUserData(ws);
    if (userData.isAdminChannelSubscribed === true) {
      ws.unsubscribe(ADMIN_CHANNEL);
      userData.isAdminChannelSubscribed = false;
      adminSubscriberCount = Math.max(0, adminSubscriberCount - 1);
    }
    return { ok: true };
  },

  handleConnectionClosed(ws: MyWebSocket): void {
    const userData = getUserData(ws);
    if (userData.isAdminChannelSubscribed === true) {
      userData.isAdminChannelSubscribed = false;
      adminSubscriberCount = Math.max(0, adminSubscriberCount - 1);
    }
  },

  hasSubscribers(): boolean {
    return adminSubscriberCount > 0;
  },
};
