import { adminOnlineUsersService } from "#app/services/admin-online-users-service.js";
import { adminWsChannelService } from "#app/services/admin-ws-channel-service.js";
import { broadcastService } from "#app/services/broadcast-service.js";
import { contactListRepository } from "#app/repositories/contact-list-repository.js";
import logger from "#logger";
import type {
  WebSocketConnectionEvent,
  WebSocketDisconnectionEvent,
} from "#vendor/types/types.js";

export const wsPresenceService = {
  async onUserConnected(event: WebSocketConnectionEvent): Promise<void> {
    await Promise.all([
      broadcastOnlineToContacts(event.userId, "online"),
      broadcastOnlineToAdminsOnConnect(event.userId),
    ]);
  },

  async onUserDisconnected(event: WebSocketDisconnectionEvent): Promise<void> {
    await Promise.all([
      broadcastOnlineToContacts(event.userId, "offline"),
      broadcastOnlineToAdminsOnDisconnect(event.userId),
    ]);
  },
};

async function broadcastOnlineToContacts(
  userId: string,
  status: string,
): Promise<void> {
  try {
    const opponentIds = await contactListRepository.findOpponentUserIds(
      BigInt(userId),
    );
    for (const opponentId of opponentIds) {
      broadcastService.broadcastMessageToUser(opponentId, "change_online", {
        userId,
        status,
      });
    }
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to broadcast online status for user ${userId}`,
    );
  }
}

async function broadcastOnlineToAdminsOnConnect(userId: string): Promise<void> {
  if (!adminWsChannelService.hasSubscribers()) return;

  try {
    const user = await adminOnlineUsersService.getOnlineUserSnapshot(userId);
    if (user === null) return;
    broadcastService.broadcastMessageToChannel(
      "admin",
      "admin_user_online_upsert",
      {
        id: user.id,
        name: user.name,
        email: user.email,
        promoCode: user.promoCode,
        appType: user.appType,
        userAgent: user.userAgent,
        connectionsCount: user.connectionsCount,
      },
    );
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to broadcast admin online connect event for user ${userId}`,
    );
  }
}

async function broadcastOnlineToAdminsOnDisconnect(
  userId: string,
): Promise<void> {
  if (!adminWsChannelService.hasSubscribers()) return;

  try {
    broadcastService.broadcastMessageToChannel(
      "admin",
      "admin_user_online_remove",
      {
        id: userId,
      },
    );
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to broadcast admin online disconnect event for user ${userId}`,
    );
  }
  return Promise.resolve();
}
