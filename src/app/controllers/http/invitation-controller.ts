import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { invitationService } from "#app/services/invitation-service.js";
import type {
  CreateInvitationResponse,
  GetUserInvitationsResponse,
  UseInvitationResponse,
} from "shared";
import type {
  CreateInvitationInput,
  GetUserInvitationsInput,
  UseInvitationInput,
} from "shared/schemas";

function setServiceErrorStatus(
  context: HttpContext,
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL",
): void {
  if (code === "BAD_REQUEST") {
    context.responseData.status = 400;
    return;
  }
  if (code === "UNAUTHORIZED") {
    context.responseData.status = 401;
    return;
  }
  if (code === "NOT_FOUND") {
    context.responseData.status = 404;
    return;
  }
  if (code === "CONFLICT") {
    context.responseData.status = 409;
    return;
  }
  context.responseData.status = 500;
}

export default {
  async createInvitation(
    context: HttpContext<CreateInvitationInput>,
  ): Promise<CreateInvitationResponse> {
    context.logger.info("createInvitation");

    const { userId, name } = getTypedPayload(context);
    const sessionUserId = context.session.sessionInfo?.data.userId;
    const result = await invitationService.createInvitation(
      userId,
      name,
      sessionUserId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return {
      status: "success",
      message: "Invitation created successfully",
      token: result.data.token,
    };
  },

  async getUserInvitations(
    context: HttpContext<GetUserInvitationsInput>,
  ): Promise<GetUserInvitationsResponse> {
    context.logger.info("getUserInvitations");

    const { userId } = getTypedPayload(context);
    const result = await invitationService.getUserInvitations(userId);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", invitations: result.data.invitations };
  },

  async useInvitation(
    context: HttpContext<UseInvitationInput>,
  ): Promise<UseInvitationResponse> {
    context.logger.info("useInvitation");

    const { token } = getTypedPayload(context);
    const result = await invitationService.useInvitation(
      token,
      context.session,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: result.data.status };
  },
};
