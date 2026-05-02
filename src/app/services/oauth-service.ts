import {
  Google,
  Facebook,
  GitHub,
  GitLab,
  generateState,
  generateCodeVerifier,
} from "arctic";
import oauthConfig from "#config/oauth.js";
import {
  userRepository,
  oauthAccountRepository,
} from "#app/repositories/index.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import type { Auth } from "#vendor/types/types.js";
import logger from "#vendor/utils/logger.js";
import { promoCodeService } from "#app/services/promo-code-service.js";
import { referralService } from "#app/services/referral-service.js";
import { applyBenefit } from "#app/services/benefit-service.js";

async function fetchJson(
  url: string,
  headers?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    url,
    headers !== undefined ? { headers } : undefined,
  );
   
  const data = await (
    response as unknown as { json(): Promise<unknown> }
  ).json();
  return data as Record<string, unknown>;
}

async function fetchJsonArray(
  url: string,
  headers?: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    url,
    headers !== undefined ? { headers } : undefined,
  );
   
  const data = await (
    response as unknown as { json(): Promise<unknown> }
  ).json();
  return data as Record<string, unknown>[];
}

const SUPPORTED_PROVIDERS = ["google", "facebook", "github", "gitlab"] as const;
type OAuthProvider = (typeof SUPPORTED_PROVIDERS)[number];

function isValidProvider(provider: string): provider is OAuthProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(provider);
}

function createGoogleClient(): Google {
  return new Google(
    oauthConfig.google.clientId,
    oauthConfig.google.clientSecret,
    oauthConfig.google.redirectUri,
  );
}

function createFacebookClient(): Facebook {
  return new Facebook(
    oauthConfig.facebook.clientId,
    oauthConfig.facebook.clientSecret,
    oauthConfig.facebook.redirectUri,
  );
}

function createGitHubClient(): GitHub {
  return new GitHub(
    oauthConfig.github.clientId,
    oauthConfig.github.clientSecret,
    oauthConfig.github.redirectUri,
  );
}

function createGitLabClient(): GitLab {
  return new GitLab(
    "https://gitlab.com",
    oauthConfig.gitlab.clientId,
    oauthConfig.gitlab.clientSecret,
    oauthConfig.gitlab.redirectUri,
  );
}

interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const data = await fetchJson(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { Authorization: `Bearer ${accessToken}` },
  );
  return {
    id:
      typeof data["id"] === "string" || typeof data["id"] === "number"
        ? String(data["id"])
        : "",
    email: typeof data["email"] === "string" ? data["email"] : "",
    name: typeof data["name"] === "string" ? data["name"] : "",
    avatar: typeof data["picture"] === "string" ? data["picture"] : null,
  };
}

async function fetchFacebookUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const data = await fetchJson(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`,
  );
  const picture = data["picture"] as Record<string, unknown> | undefined;
  const pictureData = picture?.["data"] as Record<string, unknown> | undefined;
  return {
    id:
      typeof data["id"] === "string" || typeof data["id"] === "number"
        ? String(data["id"])
        : "",
    email: typeof data["email"] === "string" ? data["email"] : "",
    name: typeof data["name"] === "string" ? data["name"] : "",
    avatar:
      typeof pictureData?.["url"] === "string" ? pictureData["url"] : null,
  };
}

async function fetchGitHubUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const data = await fetchJson("https://api.github.com/user", headers);

  let email = typeof data["email"] === "string" ? data["email"] : "";
  if (email === "") {
    const emails = await fetchJsonArray(
      "https://api.github.com/user/emails",
      headers,
    );
    const primary = emails.find(
      (e) => e["primary"] === true && e["verified"] === true,
    );
    if (primary !== undefined) {
      email = typeof primary["email"] === "string" ? primary["email"] : "";
    }
  }

  return {
    id:
      typeof data["id"] === "string" || typeof data["id"] === "number"
        ? String(data["id"])
        : "",
    email,
    name:
      typeof data["name"] === "string"
        ? data["name"]
        : typeof data["login"] === "string"
          ? data["login"]
          : "",
    avatar: typeof data["avatar_url"] === "string" ? data["avatar_url"] : null,
  };
}

async function fetchGitLabUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const data = await fetchJson("https://gitlab.com/api/v4/user", {
    Authorization: `Bearer ${accessToken}`,
  });
  return {
    id:
      typeof data["id"] === "string" || typeof data["id"] === "number"
        ? String(data["id"])
        : "",
    email: typeof data["email"] === "string" ? data["email"] : "",
    name: typeof data["name"] === "string" ? data["name"] : "",
    avatar: typeof data["avatar_url"] === "string" ? data["avatar_url"] : null,
  };
}

export const oauthService = {
  isValidProvider,

  getAuthorizationUrl(provider: string): ServiceResult<{
    url: string;
    state: string;
    codeVerifier: string | null;
  }> {
    if (!isValidProvider(provider)) {
      return failure("BAD_REQUEST", `Unsupported provider: ${provider}`);
    }

    const state = generateState();

    if (provider === "google") {
      const codeVerifier = generateCodeVerifier();
      const url = createGoogleClient().createAuthorizationURL(
        state,
        codeVerifier,
        ["openid", "profile", "email"],
      );
      return success({ url: url.toString(), state, codeVerifier });
    }

    if (provider === "facebook") {
      const url = createFacebookClient().createAuthorizationURL(state, [
        "email",
        "public_profile",
      ]);
      return success({ url: url.toString(), state, codeVerifier: null });
    }

    if (provider === "github") {
      const url = createGitHubClient().createAuthorizationURL(state, [
        "user:email",
      ]);
      return success({ url: url.toString(), state, codeVerifier: null });
    }

    // gitlab
    const url = createGitLabClient().createAuthorizationURL(state, [
      "read_user",
    ]);
    return success({ url: url.toString(), state, codeVerifier: null });
  },

  async handleCallback(
    provider: string,
    code: string,
    storedState: string,
    receivedState: string,
    codeVerifier: string | null,
    auth: Auth,
    referralContext?: { refCode?: string; clickId?: string; promoCode?: string },
  ): Promise<ServiceResult<{ redirectUrl: string }>> {
    if (!isValidProvider(provider)) {
      return failure("BAD_REQUEST", `Unsupported provider: ${provider}`);
    }

    if (storedState !== receivedState) {
      return failure("BAD_REQUEST", "OAuth state mismatch");
    }

    let accessToken: string;
    let refreshToken: string | null = null;
    let userInfo: OAuthUserInfo;

    try {
      if (provider === "google") {
        logger.info("provider google");
        const tokens = await createGoogleClient().validateAuthorizationCode(
          code,
          codeVerifier ?? "",
        );
        accessToken = tokens.accessToken();
        refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        userInfo = await fetchGoogleUserInfo(accessToken);
      } else if (provider === "facebook") {
        logger.info("provider facebook");
        const tokens =
          await createFacebookClient().validateAuthorizationCode(code);
        accessToken = tokens.accessToken();
        userInfo = await fetchFacebookUserInfo(accessToken);
      } else if (provider === "github") {
        logger.info("provider github");
        const tokens =
          await createGitHubClient().validateAuthorizationCode(code);
        accessToken = tokens.accessToken();
        userInfo = await fetchGitHubUserInfo(accessToken);
      } else {
        logger.info("provider gitlab");
        const tokens =
          await createGitLabClient().validateAuthorizationCode(code);
        accessToken = tokens.accessToken();
        refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        userInfo = await fetchGitLabUserInfo(accessToken);
      }
    } catch {
      return failure("BAD_REQUEST", "Failed to exchange authorization code");
    }

    logger.info(
      { id: userInfo.id, email: userInfo.email, name: userInfo.name },
      "oauth provider user info received",
    );

    if (userInfo.email === "") {
      logger.warn({ provider }, "oauth provider returned empty email");
      return failure("BAD_REQUEST", "Could not retrieve email from provider");
    }

    userInfo.email = userInfo.email.toLowerCase();

    logger.info({ email: userInfo.email }, "oauth email normalized");

    // Find existing OAuth account link
    const existingOAuth =
      await oauthAccountRepository.findByProviderAndProviderId(
        provider,
        userInfo.id,
      );

    logger.info(
      { existingOAuth: existingOAuth !== undefined, oauthId: existingOAuth?.id },
      "oauth account lookup",
    );

    let userId: bigint;
    let sessionToken: string;

    if (existingOAuth !== undefined) {
      // Returning user — update tokens
      userId = existingOAuth.userId;
      logger.info({ userId: String(userId) }, "oauth returning user, updating tokens");
      await oauthAccountRepository.updateTokens(
        existingOAuth.id,
        accessToken,
        refreshToken,
      );
      const returningUser = await userRepository.findById(userId);
      if (returningUser === undefined) {
        return failure("NOT_FOUND", "User not found");
      }
      sessionToken = returningUser.sessionToken;
    } else {
      // Check if user with this email already exists
      const existingUser = await userRepository.findByEmail(userInfo.email);

      logger.info(
        { existingUser: existingUser !== undefined, userId: existingUser ? String(existingUser.id) : null },
        "oauth user by email lookup",
      );

      if (existingUser !== undefined) {
        // Link OAuth account to existing user
        userId = existingUser.id;
        sessionToken = existingUser.sessionToken;
        logger.info({ userId: String(userId) }, "oauth linking to existing user");
        await oauthAccountRepository.create({
          userId,
          provider,
          providerUserId: userInfo.id,
          providerEmail: userInfo.email,
          providerName: userInfo.name,
          providerAvatar: userInfo.avatar,
          accessToken,
          refreshToken,
        });
      } else {
        // Create new user (no password)
        logger.info({ email: userInfo.email }, "oauth creating new user");
        const newUser = await userRepository.create({
          name: userInfo.name,
          email: userInfo.email,
          password: null,
          avatar: userInfo.avatar,
        });
        userId = newUser.id;
        sessionToken = newUser.sessionToken;
        logger.info({ userId: String(userId) }, "oauth new user created");
        await oauthAccountRepository.create({
          userId: newUser.id,
          provider,
          providerUserId: userInfo.id,
          providerEmail: userInfo.email,
          providerName: userInfo.name,
          providerAvatar: userInfo.avatar,
          accessToken,
          refreshToken,
        });

        // Apply promo code — best-effort
        if (referralContext?.promoCode !== undefined && referralContext.promoCode !== "") {
          try {
            const promoResult = await promoCodeService.validate(referralContext.promoCode);
            if (promoResult.ok) {
              const consumed = await promoCodeService.consume(promoResult.data.id);
              if (consumed) {
                await userRepository.update(newUser.id, { promoCodeId: promoResult.data.id });
                await applyBenefit(newUser.id, promoResult.data);
              }
            }
          } catch (err) {
            logger.warn({ err, promoCode: referralContext.promoCode }, "Failed to apply promo code during OAuth registration");
          }
        }

        // Apply referral code — best-effort
        if (referralContext?.refCode !== undefined && referralContext.refCode !== "") {
          try {
            const referrerId = await referralService.findReferrerByCode(referralContext.refCode);
            if (referrerId !== null) {
              const clickId = referralContext.clickId !== undefined ? BigInt(referralContext.clickId) : undefined;
              await referralService.recordReferral(referrerId, newUser.id, clickId);
            }
          } catch (err) {
            logger.warn({ err, refCode: referralContext.refCode }, "Failed to record referral during OAuth registration");
          }
        }
      }
    }

    await auth.login(String(userId), sessionToken);

    return success({ redirectUrl: oauthConfig.frontendSuccessUrl });
  },
};
