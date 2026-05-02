import logger from "#vendor/utils/logger.js";
import wsApiHandler from "../routing/ws-api-dispatcher.js";
import { generateUUID } from "metautil";
import type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  UserData,
} from "#vendor/start/server.js";

import type {
  MyWebSocket,
  UserConnection,
  WsMessage,
  WsResponseData,
} from "#vendor/types/types.js";
import { wsSessionHandler } from "../session/session-handler.js";
import getIP from "./get-ip.js";
import { makeJson } from "#vendor/utils/helpers/json-handlers.js";
import configApp from "#config/app.js";
import { WsMessageSchema } from "../validators/shemas/ws-shema.js";

// ---------------------------------------------------------------------------
// App hooks — registered at startup from app/start/index.ts
// ---------------------------------------------------------------------------

export interface WsAppHooks {
  onUpgrade: (
    token: string,
  ) => Promise<{ sessionId: string; userId: string; userToken: string } | null>;
  onConnected: (ws: MyWebSocket, userData: UserConnection) => Promise<void>;
  onDisconnected: (
    ws: MyWebSocket,
    userData: UserConnection,
    code: number,
  ) => Promise<void>;
  onRefreshToken: (token: string) => Promise<void>;
  onRevokeToken: (token: string) => Promise<void>;
}

let appHooks: WsAppHooks | null = null;

export const registerWsAppHooks = (hooks: WsAppHooks): void => {
  appHooks = hooks;
};

const getAppHooks = (): WsAppHooks => {
  if (appHooks === null) {
    throw new Error(
      "WS app hooks not registered. Call registerWsAppHooks() before starting the server.",
    );
  }
  return appHooks;
};

// ---------------------------------------------------------------------------
// Transport-level socket tracking (for closeAllWs only)
// ---------------------------------------------------------------------------

const wsStorage: Set<MyWebSocket> = new Set<MyWebSocket>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sendJson = (ws: MyWebSocket, data: WsResponseData): void => {
  if (typeof ws.cork !== "function") {
    logger.warn("Attempted to send message to closed or invalid WebSocket");
    return;
  }
  try {
    ws.cork(() => {
      ws.send(makeJson(data));
    });
  } catch (e) {
    logger.error({ err: e }, "Error in sendJson:");
    try {
      ws.close();
    } catch (closeError) {
      logger.error(
        { err: closeError },
        "Error closing WebSocket after send failure:",
      );
    }
  }
};

const unAuthorizedMessage = (): WsResponseData => ({
  event: "service:error",
  status: "4001",
  data: null,
  timestamp: Date.now(),
  error: {
    code: 4001,
    message: `Session expired. Please login again.`,
  },
});

const ab2str = (
  buffer: ArrayBuffer,
  encoding: BufferEncoding | undefined = "utf8",
): string => Buffer.from(buffer).toString(encoding);

const closeExpiredSession = (ws: MyWebSocket): void => {
  ws.cork(() => {
    try {
      ws.send(makeJson(unAuthorizedMessage()));
      ws.end(4001);
    } catch (e) {
      logger.error({ err: e }, "Error ws send unAuthorizedMessage");
    }
  });
};

const checkToken = (token: string): boolean =>
  token !== "" &&
  token.length === configApp.accessTokenLength &&
  /^[a-zA-Z0-9]+$/.test(token);

const normalizeAppTypeProtocol = (rawAppType: string): "web" | "pwa" => {
  if (rawAppType === "" || rawAppType === "app-web") {
    return "web";
  }
  if (rawAppType === "app-pwa") {
    return "pwa";
  }

  logger.warn(
    { rawAppType },
    "user_online: invalid app type protocol, falling back to web",
  );
  return "web";
};

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const closeAllWs = async (): Promise<void> => {
  const hooks = getAppHooks();
  for (const ws of wsStorage) {
    const userData = ws.getUserData();
    const token = userData.token;
    if (token !== "") {
      await hooks.onRevokeToken(token);
    }
    try {
      ws.end(4201);
    } catch (e) {
      logger.error({ err: e }, "closeAllWs error");
    }
  }
  wsStorage.clear();
};

// ---------------------------------------------------------------------------
// uWS callbacks
// ---------------------------------------------------------------------------

const onMessage = async (
  ws: MyWebSocket,
  wsMessage: ArrayBuffer,
  isBinary: boolean,
): Promise<void> => {
  if (isBinary) {
    logger.error("onMessage isBinary is not supported");
    return;
  }
  const jsonMessage = ab2str(wsMessage);
  const userData = ws.getUserData();

  const token = userData.token;
  if (token !== "") {
    await getAppHooks()
      .onRefreshToken(token)
      .catch((error: unknown) => {
        logger.error({ err: error }, "Error refresh token");
      });
  }

  if (jsonMessage === "ping") {
    try {
      ws.send("pong");
    } catch (e) {
      logger.error({ err: e }, "Error ws send pong");
    }
    return;
  }

  let event = "";
  let timestamp = 0;

  try {
    const parsedMessage: unknown = JSON.parse(jsonMessage);
    WsMessageSchema.assert(parsedMessage);
    const message = parsedMessage as WsMessage;

    let session = null;
    const { sessionId, userToken } = userData;
    if (sessionId !== undefined && userToken !== undefined) {
      session = await wsSessionHandler(sessionId, userToken);
    }

    if (session === null) {
      closeExpiredSession(ws);
    } else {
      event = message.event;
      timestamp = message.timestamp;
      const result = await wsApiHandler(message, ws, userData, session);
      if (result !== null) {
        sendJson(ws, result);
      } else {
        logger.error("onMessage result is null");
        sendJson(ws, {
          status: "404",
          error: { code: 404, message: "Event not found" },
          event: message.event,
          timestamp: message.timestamp,
          data: null,
        });
      }
    }
  } catch (err: unknown) {
    logger.error({ err }, "Error parse onMessage");
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "E_VALIDATION_ERROR"
    ) {
      sendJson(ws, {
        status: "422",
        error: {
          code: 422,
          message: "Validation failure",
          messages: { message: "Validation failure" },
        },
        event,
        timestamp,
        data: null,
      });
    } else {
      sendJson(ws, {
        status: "500",
        error: { code: 500, message: "Internal server error" },
        event,
        timestamp,
        data: null,
      });
    }
  }
};

const onOpen = (ws: MyWebSocket): void => {
  try {
    logger.info("onOpen ws");
    const userData = ws.getUserData();

    if (userData.userId === undefined || userData.sessionId === undefined) {
      logger.warn(
        { userId: userData.userId, sessionId: userData.sessionId },
        "Closing WS connection: missing auth data",
      );
      const errorMessage = unAuthorizedMessage();
      ws.cork(() => {
        try {
          ws.send(
            JSON.stringify(errorMessage, (_, v: unknown) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          );
          ws.end(4001);
        } catch (e) {
          logger.error({ err: e }, "Error sending unauthorized message:");
        }
      });
      return;
    }

    sendJson(ws, {
      event: "service:connection_established",
      status: "200",
      error: null,
      timestamp: Date.now(),
      data: {
        socket_id: userData.uuid,
        activity_timeout: 30,
      },
    });

    wsStorage.add(ws);
    logger.info(`onOpen ws userId: ${userData.userId}`);

    void (async (): Promise<void> => {
      try {
        await getAppHooks().onConnected(ws, userData);
      } catch (e) {
        logger.error({ err: e }, "Error in onConnected hook");
      }
    })();
  } catch (e) {
    logger.error({ err: e }, "Error in onOpen:");
    try {
      ws.end(4001);
    } catch (closeError) {
      logger.error({ err: closeError }, "Error closing connection:");
    }
  }
};

const onClose = async (
  ws: MyWebSocket,
  code: number,
  message: ArrayBuffer,
): Promise<void> => {
  logger.info("onClose code:", code);
  logger.info("onClose message:", message);
  try {
    const userData = ws.getUserData();

    const token = userData.token;
    if (token !== "") {
      try {
        await getAppHooks().onRevokeToken(token);
      } catch (e) {
        logger.error({ err: e }, "Error in onRevokeToken hook");
      }
    }

    wsStorage.delete(ws);

    const { userId, sessionId } = userData;
    if (userId !== undefined && sessionId !== undefined) {
      try {
        await getAppHooks().onDisconnected(ws, userData, code);
      } catch (e) {
        logger.error({ err: e }, "Error in onDisconnected hook");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "Error onClose");
  }
};

const handleUpgrade = async (
  res: HttpResponse,
  req: HttpRequest,
  context: us_socket_context_t,
): Promise<void> => {
  logger.info("handleUpgrade");
  let aborted = false as boolean;
  res.onAborted(() => {
    logger.warn("Client aborted before operation completed");
    aborted = true;
  });

  const secWebsocketKey = req.getHeader("sec-websocket-key");
  const secWebsocketProtocol = req.getHeader("sec-websocket-protocol");
  const secWebsocketExtensions = req.getHeader("sec-websocket-extensions");
  const userAgent = req.getHeader("user-agent");
  const ip = getIP(req, res);
  const protocols = secWebsocketProtocol
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");

  // Token is transmitted via Sec-WebSocket-Protocol header (the only custom
  // header the browser WebSocket API supports). The client sends the auth
  // token first and the app-type marker second. The server must echo back
  // only the selected subprotocol, otherwise browsers reject the handshake.
  const token = protocols[0] ?? "";
  const appType = normalizeAppTypeProtocol(protocols[1] ?? "");

  if (!checkToken(token)) {
    res.writeStatus("401 Unauthorized").end("Invalid token format");
    return;
  }

  const dataAccess = await getAppHooks().onUpgrade(token);

  if (!aborted) {
    res.cork(() => {
      const userData: UserData = {
        ip,
        ip2: ab2str(res.getProxiedRemoteAddressAsText()),
        token,
        user: null,
        uuid: generateUUID(),
        sessionId: dataAccess !== null ? dataAccess.sessionId : undefined,
        userId: dataAccess !== null ? dataAccess.userId : undefined,
        userToken: dataAccess !== null ? dataAccess.userToken : undefined,
        timeStart: Date.now(),
        userAgent,
        appType,
      };
      res.upgrade(
        userData,
        secWebsocketKey,
        token,
        secWebsocketExtensions,
        context,
      );
    });
  }
};

export { onMessage, onOpen, onClose, handleUpgrade, closeAllWs };
