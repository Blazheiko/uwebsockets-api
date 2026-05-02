import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { authService } from "#app/services/auth-service.js";
import type {
  ChangePasswordResponse,
  ForgotPasswordResponse,
  RegisterResponse,
  LoginResponse,
  LogoutResponse,
  LogoutAllResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
  ResendVerificationEmailResponse,
} from "shared";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "shared/schemas";
import { emailVerificationService } from "#app/services/email-verification-service.js";
import { passwordResetService } from "#app/services/password-reset-service.js";

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
  async register(
    context: HttpContext<RegisterInput>,
  ): Promise<RegisterResponse> {
    context.logger.info("register handler");

    const payload = getTypedPayload(context);
    const result = await authService.register(
      payload,
      context.auth,
      context.session,
      context.logger,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return {
      status: result.data.status,
      user: result.data.user,
      wsUrl: result.data.wsUrl,
    };
  },

  async login(context: HttpContext<LoginInput>): Promise<LoginResponse> {
    context.logger.info("login handler");

    const payload = getTypedPayload(context);
    const result = await authService.login(
      payload,
      context.auth,
      context.session,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      if (result.code === "UNAUTHORIZED") {
        return { status: "unauthorized", message: result.message };
      }
      return { status: "error", message: result.message };
    }

    return {
      status: result.data.status,
      user: result.data.user,
      wsUrl: result.data.wsUrl,
    };
  },

  async logout(context: HttpContext): Promise<LogoutResponse> {
    context.logger.info("logout handler");
    const result = await authService.logout(context.auth);
    return { status: result.data.status };
  },

  async logoutAll(context: HttpContext): Promise<LogoutAllResponse> {
    context.logger.info("logoutAll handler");
    const result = await authService.logoutAll(context.auth);
    return {
      status: result.data.status,
      deletedCount: result.data.deletedCount,
    };
  },

  async changePassword(
    context: HttpContext<ChangePasswordInput>,
  ): Promise<ChangePasswordResponse> {
    context.logger.info("changePassword handler");

    if (!context.auth.check()) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const userId = context.auth.getUserId();
    if (userId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await authService.changePassword(BigInt(userId), payload);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success" };
  },

  async forgotPassword(
    context: HttpContext<ForgotPasswordInput>,
  ): Promise<ForgotPasswordResponse> {
    const payload = getTypedPayload(context);
    const result = await passwordResetService.requestPasswordReset(payload.email);
    return { status: "success", message: result.data.message };
  },

  async resetPassword(
    context: HttpContext<ResetPasswordInput>,
  ): Promise<ResetPasswordResponse> {
    const payload = getTypedPayload(context);
    const result = await passwordResetService.resetPassword(
      payload.token,
      payload.password,
      payload.passwordConfirm,
    );
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return {
        status: "error",
        message: result.message,
        ...("reason" in result ? { reason: result.reason } : {}),
      };
    }

    return { status: "success" };
  },

  async verifyEmail(
    context: HttpContext<VerifyEmailInput>,
  ): Promise<VerifyEmailResponse> {
    const payload = getTypedPayload(context);
    const result = await emailVerificationService.verifyEmail(payload.token);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", message: result.data.message };
  },

  async resendVerificationEmail(
    context: HttpContext,
  ): Promise<ResendVerificationEmailResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const result = await emailVerificationService.queueVerificationEmail(
      BigInt(userId),
    );
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", message: result.data.message };
  },
};
