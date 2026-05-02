import type { HttpContext } from "#vendor/types/types.js";
import { oauthService } from "#app/services/oauth-service.js";
import oauthConfig from "#config/oauth.js";
import type { OAuthRedirectResponse, OAuthCallbackResponse } from "shared";

export default {
  async redirect(context: HttpContext): Promise<OAuthRedirectResponse> {
    const provider = context.httpData.params["provider"] ?? "";
    context.logger.info({ provider }, "oauth redirect handler");

    context.logger.info({ oauthConfig: oauthConfig }, "oauth config debug");

    const result = oauthService.getAuthorizationUrl(provider);

    if (!result.ok) {
      context.responseData.status = 400;
      return { status: "error", message: result.message };
    }

    context.logger.info({ url: result.data.url }, "oauth generated URL");

    // Store state, codeVerifier, and referral/promo context in session
    const refCode = context.httpData.query.get("refCode") ?? "";
    const clickId = context.httpData.query.get("clickId") ?? "";
    const promoCode = context.httpData.query.get("promoCode") ?? "";
    await context.session.updateSessionData({
      oauthState: result.data.state,
      oauthCodeVerifier: result.data.codeVerifier,
      ...(refCode !== "" && { oauthRefCode: refCode }),
      ...(clickId !== "" && { oauthClickId: clickId }),
      ...(promoCode !== "" && { oauthPromoCode: promoCode }),
    });

    context.responseData.status = 302;
    context.responseData.setHeader("Location", result.data.url);

    return { status: "redirect" };
  },

  async callback(context: HttpContext): Promise<OAuthCallbackResponse> {
    const { httpData, logger, session, responseData, auth } = context;
    const provider = httpData.params["provider"] ?? "";
    const code = httpData.query.get("code") ?? "";
    const receivedState = httpData.query.get("state") ?? "";

    logger.info({ provider }, "oauth callback handler");

    const sessionData = session.sessionInfo?.data;
    const storedState =
      typeof sessionData?.["oauthState"] === "string"
        ? sessionData["oauthState"]
        : "";
    const codeVerifier =
      typeof sessionData?.["oauthCodeVerifier"] === "string"
        ? sessionData["oauthCodeVerifier"]
        : null;
    const oauthRefCode =
      typeof sessionData?.["oauthRefCode"] === "string"
        ? sessionData["oauthRefCode"]
        : undefined;
    const oauthClickId =
      typeof sessionData?.["oauthClickId"] === "string"
        ? sessionData["oauthClickId"]
        : undefined;
    const oauthPromoCode =
      typeof sessionData?.["oauthPromoCode"] === "string"
        ? sessionData["oauthPromoCode"]
        : undefined;

    if (code === "" || receivedState === "" || storedState === "") {
      responseData.status = 302;
      responseData.setHeader("Location", oauthConfig.frontendErrorUrl);
      return { status: "error", message: "Missing OAuth parameters" };
    }

    const referralContext: { refCode?: string; clickId?: string; promoCode?: string } = {};
    if (oauthRefCode !== undefined) referralContext.refCode = oauthRefCode;
    if (oauthClickId !== undefined) referralContext.clickId = oauthClickId;
    if (oauthPromoCode !== undefined) referralContext.promoCode = oauthPromoCode;

    const result = await oauthService.handleCallback(
      provider,
      code,
      storedState,
      receivedState,
      codeVerifier,
      auth,
      referralContext,
    );

    // Clean up OAuth session data
    await session.updateSessionData({
      oauthState: undefined,
      oauthCodeVerifier: undefined,
      oauthRefCode: undefined,
      oauthClickId: undefined,
      oauthPromoCode: undefined,
    });

    if (!result.ok) {
      responseData.status = 302;
      responseData.setHeader("Location", oauthConfig.frontendErrorUrl);
      return { status: "error", message: result.message };
    }

    responseData.status = 302;
    responseData.setHeader("Location", result.data.redirectUrl);

    return { status: "success" };
  },
};
