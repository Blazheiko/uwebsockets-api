import { adminOnlineUsersService } from "#app/services/admin-online-users-service.js";
import type { HttpContext } from "#vendor/types/types.js";
import type {
  AdminOnlineUserDetailResponse,
  AdminOnlineUserListResponse,
} from "shared/responses";

export default {
  async list(_context: HttpContext): Promise<AdminOnlineUserListResponse> {
    const items = await adminOnlineUsersService.listOnlineUsers();
    return {
      status: "success",
      items,
      total: items.length,
    };
  },

  async getById(context: HttpContext): Promise<AdminOnlineUserDetailResponse> {
    const idParam = context.httpData.params["id"] ?? "";
    if (!/^\d+$/.test(idParam)) {
      context.responseData.status = 400;
      return { status: "error", message: "Invalid user id" };
    }

    const user = await adminOnlineUsersService.getOnlineUserDetail(BigInt(idParam));
    if (user === undefined) {
      context.responseData.status = 404;
      return { status: "error", message: "User not found" };
    }

    return {
      status: "success",
      user,
    };
  },
};
