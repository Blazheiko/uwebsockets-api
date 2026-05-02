import type {
  HttpData,
  ResponseData,
  SessionInfo,
} from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import { teacherSettingsRepository } from "#app/repositories/teacher-settings-repository.js";
import { userTransformer } from "#app/transformers/index.js";
import { generateWsToken } from "#app/services/generate-ws-token-service.js";
import { getWsUrl } from "#app/services/get-ws-url-service.js";
import { generateTurnCredentials } from "#app/services/turn-credentials.js";
import {
  success,
  type ServiceSuccess,
} from "#app/services/shared/service-result.js";
import diskConfig from "#config/disk.js";
import appConfig from "#config/app.js";
import type { SaveUserInput } from "shared/schemas";
import { messageRepository } from "#app/repositories/message-repository.js";
import {
  DEFAULT_LEARNING_LANGUAGE,
  normalizeLearningLanguage,
  normalizeNativeLanguage,
} from "#app/services/shared/teacher-settings-language.js";

interface StorageConfigPayload {
  cdnUrl: string;
  s3Prefix: string;
  s3StaticDataPrefix: string;
  s3DynamicDataPrefix: string;
}

interface InitUserPayload {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  avatar: string | null;
  role: 'user' | 'admin' | 'partner';
  createdAt: string;
  updatedAt: string;
}

interface WebrtcIceServerPayload {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const mainService = {
  ping(): ServiceSuccess<{ status: "ok" }> {
    return success({ status: "ok" });
  },

  testRoute(): ServiceSuccess<{ status: "ok" }> {
    return success({ status: "ok" });
  },

  testHeaders(
    httpData: HttpData,
  ): ServiceSuccess<{
    status: "ok";
    headers: { key: string; value: string }[];
    params: unknown[];
  }> {
    const headers: { key: string; value: string }[] = [];
    const params: unknown[] = Object.entries(httpData.params);

    httpData.headers.forEach((value, key) => {
      headers.push({ key, value });
    });

    return success({ status: "ok", headers, params });
  },

  getSetCookies(
    httpData: HttpData,
  ): ServiceSuccess<{
    status: "ok";
    cookies: { key: string; value: string }[];
  }> {
    const cookies: { key: string; value: string }[] = [];
    httpData.cookies.forEach((value, key) => {
      cookies.push({ key, value });
    });
    return success({ status: "ok", cookies });
  },

  testSession(
    httpData: HttpData,
    sessionInfo: SessionInfo | null,
  ): ServiceSuccess<{
    status: "ok";
    cookies: { key: string; value: string }[];
    sessionInfo: SessionInfo | null;
  }> {
    const cookies: { key: string; value: string }[] = [];
    httpData.cookies.forEach((value, key) => {
      cookies.push({ key, value });
    });
    return success({ status: "ok", cookies, sessionInfo });
  },

  testApiSession(
    httpData: HttpData,
    sessionInfo: SessionInfo | null,
  ): ServiceSuccess<{
    status: "ok";
    headers: { key: string; value: string }[];
    sessionInfo: SessionInfo | null;
  }> {
    const headers: { key: string; value: string }[] = [];
    httpData.headers.forEach((value, key) => {
      headers.push({ key, value });
    });

    return success({ status: "ok", headers, sessionInfo });
  },

  index(
    httpData: HttpData,
    responseData: ResponseData,
  ): ServiceSuccess<{ payload: HttpData; responseData: ResponseData }> {
    return success({ payload: httpData, responseData });
  },

  testParams(
    httpData: HttpData,
  ): ServiceSuccess<{
    params: HttpData["params"];
    query: string[];
    status: "ok";
  }> {
    return success({
      params: httpData.params,
      query: httpData.query.getAll("test"),
      status: "ok",
    });
  },

  async updateWsToken(
    sessionInfo: SessionInfo | null,
  ): Promise<
    ServiceSuccess<{
      status: "ok" | "unauthorized";
      message?: string;
      wsUrl: string;
      wsToken: string;
    }>
  > {
    if (sessionInfo === null) {
      return success({
        status: "unauthorized",
        message: "Session not found",
        wsUrl: "",
        wsToken: "",
      });
    }

    const userId = sessionInfo.data.userId;
    if (userId === undefined || userId === "") {
      return success({
        status: "unauthorized",
        message: "Session expired",
        wsUrl: "",
        wsToken: "",
      });
    }

    const wsToken = await generateWsToken(sessionInfo, userId);
    return success({
      status: "ok",
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
    });
  },

  getWebrtcIceConfig(sessionInfo: SessionInfo | null): ServiceSuccess<{
    status: "ok" | "error" | "unauthorized";
    message?: string;
    iceServers?: WebrtcIceServerPayload[];
    ttl?: number;
    expiresAt?: number;
  }> {
    if (sessionInfo === null) {
      return success({ status: "unauthorized", message: "Session not found" });
    }

    const userId = sessionInfo.data.userId;
    if (userId === undefined || userId === "") {
      return success({ status: "unauthorized", message: "Session expired" });
    }

    try {
      const credentials = generateTurnCredentials(String(userId));
      const expiresAt = Math.floor(Date.now() / 1000) + credentials.ttl;

      const [stunUrl, ...turnUrls] = credentials.urls;
      const iceServers: WebrtcIceServerPayload[] = [];
      if (typeof stunUrl === "string" && stunUrl !== "") {
        iceServers.push({ urls: stunUrl });
      }
      if (turnUrls.length > 0) {
        iceServers.push({
          urls: turnUrls,
          username: credentials.username,
          credential: credentials.credential,
        });
      }

      if (iceServers.length === 0) {
        throw new Error("TURN credentials are empty");
      }

      return success({
        status: "ok",
        iceServers,
        ttl: credentials.ttl,
        expiresAt,
      });
    } catch {
      return success({
        status: "error",
        message: "TURN is not configured",
      });
    }
  },

  async init(
    sessionInfo: SessionInfo | null,
    browserLanguage: string = "en",
  ): Promise<
    ServiceSuccess<{
      status: "ok" | "error" | "unauthorized";
      message?: string;
      user?: InitUserPayload;
      wsUrl?: string;
      wsToken?: string;
      storage?: StorageConfigPayload;
      unreadMessagesCount?: number;
    }>
  > {
    if (sessionInfo === null) {
      return success({ status: "error", message: "Session not found" });
    }

    const userId = sessionInfo.data.userId;
    if (userId === undefined || userId === "") {
      return success({ status: "unauthorized", message: "Session expired" });
    }

    const user = await userRepository.findById(BigInt(userId));
    if (user === undefined) {
      return success({ status: "unauthorized", message: "Session expired" });
    }

    const [wsToken, teacherSettings, unreadMessagesCount] = await Promise.all([
      generateWsToken(sessionInfo, String(user.id)),
      teacherSettingsRepository.findByUserId(user.id),
      messageRepository.getUnreadCount(user.id),
    ]);
    const langLearning = normalizeLearningLanguage(
      teacherSettings?.langLearning ?? DEFAULT_LEARNING_LANGUAGE,
    );
    const langNative = normalizeNativeLanguage(
      teacherSettings?.langNative,
      browserLanguage,
    );

    return success({
      status: "ok",
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerifiedAt !== null,
        emailVerifiedAt: user.emailVerifiedAt === null ? null : user.emailVerifiedAt.toISOString(),
        avatar: user.avatar ?? null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
      unreadMessagesCount,
      storage: {
        cdnUrl: appConfig.cdnUrl,
        s3Prefix: diskConfig.s3Prefix ?? "",
        s3StaticDataPrefix: diskConfig.s3StaticDataPrefix ?? "",
        s3DynamicDataPrefix: diskConfig.s3DynamicDataPrefix ?? "",
      },
      hasTeacherSettings: teacherSettings !== undefined,
      teacher: {
        teacherName: teacherSettings?.teacherName ?? "",
        teacherGender: teacherSettings?.teacherVoiceGender ?? "female",
        langLearning,
        langNative,
      },
    });
  },

  setHeaderAndCookie(
    responseData: ResponseData,
  ): ServiceSuccess<{ status: "ok" }> {
    responseData.headers.push({ name: "test-header", value: "test" });
    responseData.setCookie({
      name: "cookieTest1",
      value: "test",
      path: "/",
      httpOnly: true,
      secure: false,
      maxAge: 3600,
      expires: undefined,
      sameSite: undefined,
    });
    responseData.setCookie("cookieTest2", "test");
    return success({ status: "ok" });
  },

  testMiddleware(
    responseData: ResponseData,
  ): ServiceSuccess<{ middlewares: string[]; status: "ok" }> {
    return success({
      middlewares: responseData.middlewareData as unknown as string[],
      status: "ok",
    });
  },

  async saveUser(
    payload: SaveUserInput,
  ): Promise<
    ServiceSuccess<{
      status: "ok";
      user: ReturnType<typeof userTransformer.serialize>;
    }>
  > {
    const user = await userRepository.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
    });

    return success({ status: "ok", user: userTransformer.serialize(user) });
  },
};
