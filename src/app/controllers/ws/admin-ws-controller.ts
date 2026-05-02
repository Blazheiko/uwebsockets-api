import { adminWsChannelService } from "#app/services/admin-ws-channel-service.js";
import type { WsContext } from "#vendor/types/types.js";
import type { AdminOnlineUsersWsResponse } from "shared/responses";

export default {
  subscribeOnlineUsers(context: WsContext): AdminOnlineUsersWsResponse {
    const result = adminWsChannelService.subscribeCurrentAdminConnection(context.ws);
    if (!result.ok) {
      context.responseData.status = "403";
      return { status: "error", message: result.message };
    }
    return { status: "success" };
  },

  unsubscribeOnlineUsers(context: WsContext): AdminOnlineUsersWsResponse {
    adminWsChannelService.unsubscribeCurrentAdminConnection(context.ws);
    return { status: "success" };
  },
};
