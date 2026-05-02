import { hashPassword, validatePassword } from "metautil";
import type { Auth, Session } from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import { userTransformer } from "#app/transformers/index.js";
import {
  failure,
  success,
  type ServiceResult,
  type ServiceSuccess,
} from "#app/services/shared/service-result.js";
import { acceptInvitation } from "#app/services/invitation-accept-service.js";
import { generateWsToken } from "#app/services/generate-ws-token-service.js";
import { getWsUrl } from "#app/services/get-ws-url-service.js";
import { promoCodeService } from "#app/services/promo-code-service.js";
import { referralService } from "#app/services/referral-service.js";
import { applyBenefit } from "#app/services/benefit-service.js";
import { emailVerificationService } from "#app/services/email-verification-service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "shared/schemas";
import type { Logger } from "pino";

export const authService = {
  async register(
    payload: RegisterInput,
    auth: Auth,
    session: Session,
    logger: Logger,
  ): Promise<
    ServiceResult<{
      status: "success" | "error";
      user: ReturnType<typeof userTransformer.serialize>;
      wsUrl: string;
      wsToken: string;
    }>
  > {
    const { name, password, token } = payload;
    const email = payload.email.toLowerCase();

    const exist = await userRepository.findByEmail(email);
    if (exist !== undefined) {
      return failure("CONFLICT", "Email already exist");
    }

    const oldSessionData = session.sessionInfo?.data;
    const hash = await hashPassword(password);

    const userCreated = await userRepository.create({
      name,
      email,
      password: hash,
      // sessionToken is auto-generated via $defaultFn in schema
    });


    const invTokenRegister = oldSessionData?.["inventionToken"];
    if (typeof invTokenRegister === "string" && invTokenRegister !== "") {
      await acceptInvitation(invTokenRegister, String(userCreated.id));
    }

    // Handle promo code — best-effort, does not block registration
    try {
      if (payload.promoCode !== undefined && payload.promoCode !== "") {
        const promoResult = await promoCodeService.validate(payload.promoCode);
        if (promoResult.ok) {
          const consumed = await promoCodeService.consume(promoResult.data.id);
          if (consumed) {
            await userRepository.update(userCreated.id, { promoCodeId: promoResult.data.id });
            await applyBenefit(userCreated.id, promoResult.data);
          }
        }
      }
    } catch (err) {
      logger.warn({ err, promoCode: payload.promoCode }, "Failed to apply promo code during registration");
    }

    // Handle referral code — best-effort, does not block registration
    try {
      if (payload.refCode !== undefined && payload.refCode !== "") {
        const referrerId = await referralService.findReferrerByCode(payload.refCode);
        if (referrerId !== null) {
          const clickId = payload.clickId !== undefined ? BigInt(payload.clickId) : undefined;
          await referralService.recordReferral(referrerId, userCreated.id, clickId);
        }
      }
    } catch (err) {
      logger.warn({ err, refCode: payload.refCode }, "Failed to record referral during registration");
    }

    void emailVerificationService.sendVerificationEmailAfterRegistration(
      userCreated.id,
    );

    await session.destroySession(session.sessionInfo?.id);
    const loggedIn = await auth.login(String(userCreated.id), userCreated.sessionToken);
    const status: "success" | "error" = loggedIn ? "success" : "error";

    const sessionInfo = session.sessionInfo;
    let wsToken = "";
    if (sessionInfo !== null) {
      wsToken = await generateWsToken(sessionInfo, String(userCreated.id));
    }

    if (token !== "") {
      await acceptInvitation(token, String(userCreated.id));
    }

    return success({
      status,
      user: userTransformer.serialize(userCreated),
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
    });
  },

  async login(
    payload: LoginInput,
    auth: Auth,
    session: Session,
  ): Promise<
    ServiceResult<{
      status: "success" | "error";
      user: ReturnType<typeof userTransformer.serialize>;
      wsUrl: string;
      wsToken: string;
    }>
  > {
    const { password, token } = payload;
    const email = payload.email.toLowerCase();

    const user = await userRepository.findByEmail(email);
    if (user === undefined) {
      return failure("UNAUTHORIZED", "unauthorized");
    }

    if (user.password === null || user.password === "") {
      return failure(
        "BAD_REQUEST",
        "Please use social login for this account",
      );
    }

    const valid = await validatePassword(password, user.password);
    if (!valid) {
      return failure("UNAUTHORIZED", "unauthorized");
    }

    const oldSessionData = session.sessionInfo?.data;
    const invTokenLogin = oldSessionData?.["inventionToken"];
    if (typeof invTokenLogin === "string" && invTokenLogin !== "") {
      await acceptInvitation(invTokenLogin, String(user.id));
    }

    const loggedIn = await auth.login(String(user.id), user.sessionToken);
    const status: "success" | "error" = loggedIn ? "success" : "error";
    const sessionInfo = session.sessionInfo;

    let wsToken = "";
    if (sessionInfo !== null) {
      wsToken = await generateWsToken(sessionInfo, String(user.id));
    }

    if (token !== "") {
      await acceptInvitation(token, String(user.id));
    }

    return success({
      status,
      user: userTransformer.serialize(user),
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
    });
  },

  async logout(
    auth: Auth,
  ): Promise<ServiceSuccess<{ status: "success" | "error" }>> {
    const result = await auth.logout();
    const status: "success" | "error" = result ? "success" : "error";
    return success({ status });
  },

  async logoutAll(
    auth: Auth,
  ): Promise<
    ServiceSuccess<{ status: "success" | "error"; deletedCount: number }>
  > {
    const result = await auth.logoutAll();
    const status: "success" | "error" = result > 0 ? "success" : "error";
    return success({
      status,
      deletedCount: result,
    });
  },

  async changePassword(
    userId: bigint,
    payload: ChangePasswordInput,
  ): Promise<ServiceResult<{ status: "success" }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    const storedPassword = user.password;
    const hasPassword = storedPassword !== null && storedPassword !== "";
    if (hasPassword) {
      if (payload.currentPassword === undefined || payload.currentPassword === "") {
        return failure("BAD_REQUEST", "Current password is required");
      }

      const valid = await validatePassword(payload.currentPassword, storedPassword);
      if (!valid) {
        return failure("BAD_REQUEST", "Current password is incorrect");
      }
    }

    const newPasswordHash = await hashPassword(payload.newPassword);
    const updated = await userRepository.update(userId, { password: newPasswordHash });
    if (updated === undefined) {
      return failure("INTERNAL", "Failed to update password");
    }

    return success({ status: "success" });
  },
};
