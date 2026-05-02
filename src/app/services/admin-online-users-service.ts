import { userRepository } from "#app/repositories/index.js";
import { wsConnectionRegistry } from "#app/websocket/ws-connection-registry.js";

export interface AdminOnlineUserItem {
  id: string;
  name: string;
  email: string;
  promoCode: string | null;
  appType: "web" | "pwa";
  userAgent: string;
  connectionsCount: number;
}

export interface AdminOnlineUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  promoCode: string | null;
  referralCode: string | null;
  premiumUntil: string | null;
  betaAccess: boolean;
  discountPercent: number;
  createdAt: string;
  isOnline: boolean;
  appType: "web" | "pwa" | null;
  userAgent: string | null;
  connections: {
    uuid: string;
    ip: string;
    userAgent: string;
    appType: "web" | "pwa";
  }[];
}

export const adminOnlineUsersService = {
  async listOnlineUsers(): Promise<AdminOnlineUserItem[]> {
    const onlineUsers = wsConnectionRegistry.getOnlineUsers();
    if (onlineUsers.length === 0) return [];

    const users = await userRepository.findAdminOnlineUsersByIds(
      onlineUsers.map((entry) => BigInt(entry.userId)),
    );
    const metaById = new Map(onlineUsers.map((entry) => [entry.userId, entry]));

    return users
      .map((user) => {
        const meta = metaById.get(String(user.id));
        if (meta === undefined) return null;
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          promoCode: user.promoCode,
          appType: meta.appType,
          userAgent: meta.userAgent,
          connectionsCount: meta.connectionsCount,
        };
      })
      .filter((item): item is AdminOnlineUserItem => item !== null);
  },

  async getOnlineUserDetail(userId: bigint): Promise<AdminOnlineUserDetail | undefined> {
    const user = await userRepository.findAdminUserDetailById(userId);
    if (user === undefined) return undefined;

    const meta = wsConnectionRegistry.getOnlineUserMeta(String(userId));

    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      promoCode: user.promoCode,
      referralCode: user.referralCode,
      premiumUntil: user.premiumUntil !== null ? user.premiumUntil.toISOString() : null,
      betaAccess: user.betaAccess,
      discountPercent: user.discountPercent,
      createdAt: user.createdAt.toISOString(),
      isOnline: meta !== undefined,
      appType: meta?.appType ?? null,
      userAgent: meta?.userAgent ?? null,
      connections: meta?.connections ?? [],
    };
  },

  async getOnlineUserSnapshot(userId: string): Promise<AdminOnlineUserItem | null> {
    const meta = wsConnectionRegistry.getOnlineUserMeta(userId);
    if (meta === undefined) return null;

    const users = await userRepository.findAdminOnlineUsersByIds([BigInt(userId)]);
    const user = users.at(0);
    if (user === undefined) return null;

    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      promoCode: user.promoCode,
      appType: meta.appType,
      userAgent: meta.userAgent,
      connectionsCount: meta.connectionsCount,
    };
  },
};
