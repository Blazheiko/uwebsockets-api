import * as uWS from "uWebSockets.js";
import type {
  HttpRequest,
  HttpResponse,
  us_listen_socket,
  WebSocket,
  TemplatedApp,
} from "uWebSockets.js";
import appConfig from "#config/app.js";
import corsConfig from "#config/cors.js";
import cookiesConfig from "#config/cookies.js";
import state from "#app/state/state.js";
import {
  onMessage,
  onOpen,
  onClose,
  handleUpgrade,
  closeAllWs,
} from "#vendor/utils/network/ws-handlers.js";
import {
  getHeaders,
  getData,
  extractParameters,
  normalizePath,
  parseCookies,
  detectBodyKind,
  resolveMaxBodySize,
  type BodyKind,
  type RequestAbortSignal,
} from "../utils/network/http-request-handlers.js";
import { ParameterValidationError } from "#app/validate/checkers/parameter-checker.js";
import { ValidationError } from "#app/validate/errors/validation-error.js";
import { PayloadTooLargeError } from "#vendor/utils/network/errors/payload-too-large-error.js";
import { UnsupportedMediaTypeError } from "#vendor/utils/network/errors/unsupported-media-type-error.js";
import logger from "#vendor/utils/logger.js";
import { getListRoutes } from "#vendor/start/router.js";
import {
  setHeaders,
  setCookies,
  setSecurityHeaders,
} from "#vendor/utils/network/http-response-handlers.js";
import executeMiddlewares from "#vendor/utils/middlewares/core/execute-httpMiddlewares.js";
import checkRateLimit from "#vendor/utils/rate-limit/http-rate-limit.js";
import type {
  Cookie,
  Header,
  HttpData,
  MyWebSocket,
  ResponseData,
  RouteItem,
  Payload,
  CookieOptions,
  UploadedFile,
} from "#vendor/types/types.js";
import contextHandler from "../utils/context/http-context.js";
import {
  cacheStaticSource,
  staticHandler,
  staticCacheHandler,
} from "#vendor/start/static-server.js";
import configApp from "#config/app.js";
import httpRoutes from "#app/routes/http-routes.js";
import wsRoutes from "#app/routes/ws-routes.js";
// import schemas from "#app/validate/schemas/schemas.js";
import getIP from "#vendor/utils/network/get-ip.js";
import { serializeRoutes } from "#vendor/utils/routing/serialize-routes.js";
import {
  makeBroadcastJson,
  makeJson,
} from "#vendor/utils/helpers/json-handlers.js";
import { type } from "@arktype/type";
import * as console from "node:console";

export type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  us_listen_socket,
  WebSocket,
  TemplatedApp,
  CompressOptions,
} from "uWebSockets.js";

export type UserData = Record<string, unknown>;
const server: TemplatedApp = uWS.App();

const broadcastToChannel = (
  channel: string,
  event: string,
  payload: Payload,
): void => {
  server.publish(channel, makeBroadcastJson(event, 200, payload));
};

const configureWebsockets = (server: TemplatedApp): TemplatedApp => {
  return server.ws(`/${appConfig.pathPrefix}/websocket`, {
    compression: 0,
    idleTimeout: 120, // According to protocol
    maxPayloadLength: 1 * 1024 * 1024,
    maxBackpressure: 64 * 1024,
    open: (ws: WebSocket<Record<string, unknown>>): void => {
      onOpen(ws as MyWebSocket);
    },
    message: (
      ws: WebSocket<Record<string, unknown>>,
      message: ArrayBuffer,
      isBinary: boolean,
    ) => onMessage(ws as MyWebSocket, message, isBinary),
    // upgrade: async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
    //    await handleUpgrade(res, req, context);
    // },
    upgrade: handleUpgrade,
    // drain: (ws) => handleDrain(ws),
    close: (
      ws: WebSocket<Record<string, unknown>>,
      code: number,
      message: ArrayBuffer,
    ): void => {
      onClose(ws as MyWebSocket, code, message).catch((error: unknown) => {
        console.error(error);
      });
    },
  });
};

type DeleteCookie = (name: string) => void;
type SetHeader = (name: string, value: string) => void;
// CSP header is applied from staticServer for HTML responses
const getResponseData = (): ResponseData => {
  const cookies: Map<string, Cookie> = new Map<string, Cookie>();
  const headers: Header[] = [];
  const setCookie: ResponseData["setCookie"] = (
    nameOrCookie: string | Cookie,
    value?: string,
    options?: CookieOptions,
  ): void => {
    if (typeof nameOrCookie === "string") {
      cookies.set(nameOrCookie, {
        name: nameOrCookie,
        value: value ?? "",
        path: options?.path ?? cookiesConfig.default.path,
        httpOnly: options?.httpOnly ?? cookiesConfig.default.httpOnly,
        secure: options?.secure ?? cookiesConfig.default.secure,
        expires: options?.expires ?? undefined,
        maxAge: options?.maxAge ?? cookiesConfig.default.maxAge,
        sameSite: options?.sameSite ?? cookiesConfig.default.sameSite,
      });
      return;
    }

    cookies.set(nameOrCookie.name, nameOrCookie);
  };

  const deleteCookie: DeleteCookie = (name: string): void => {
    cookies.delete(name);
  };
  const setHeader: SetHeader = (name: string, value: string): void => {
    headers.push({ name, value });
  };

  return {
    aborted: false,
    payload: {},
    middlewareData: {},
    headers,
    cookies,
    status: 200,
    setCookie,
    deleteCookie,
    setHeader,
  };
};

interface RequestMetadata {
  ip: string;
  cookies: Map<string, string>;
  query: URLSearchParams;
  headers: Map<string, string>;
  params: Record<string, string>;
  contentType: string | undefined;
  bodyKind: BodyKind;
  hasBody: boolean;
}

// uWS `req` is only valid until the first `await`. Collect everything
// synchronously here so rate-limit (and any other pre-body checks) can run
// against a detached snapshot.
const collectRequestMetadata = (
  req: HttpRequest,
  res: HttpResponse,
  route: RouteItem,
): RequestMetadata => {
  const cookies: Map<string, string> = parseCookies(req.getHeader("cookie"));
  const query = new URLSearchParams(req.getQuery());
  const headers = getHeaders(req);
  const params: Record<string, string> =
    route.parametersKey !== undefined && route.parametersKey.length > 0
      ? extractParameters(route.parametersKey, req)
      : {};
  const contentType = headers.get("content-type");
  const ip = getIP(req, res);
  const hasBody = route.method === "post" || route.method === "put";
  const bodyKind: BodyKind =
    contentType !== undefined ? detectBodyKind(contentType) : "other";

  return {
    ip,
    cookies,
    query,
    headers,
    params,
    contentType,
    bodyKind,
    hasBody,
  };
};

const readAndParseBody = async (
  res: HttpResponse,
  meta: RequestMetadata,
  route: RouteItem,
  abortSignal: RequestAbortSignal,
): Promise<{
  payload: Payload | null;
  files: Map<string, UploadedFile> | null;
}> => {
  if (!meta.hasBody || meta.contentType === undefined) {
    return { payload: null, files: null };
  }

  const allowed: BodyKind[] = route.allowedContentTypes ?? ["json"];
  if (!allowed.includes(meta.bodyKind)) {
    logger.warn(
      {
        routeUrl: route.url,
        routeMethod: route.method,
        receivedContentType: meta.contentType,
        allowed,
      },
      "Content-type rejected — add allowedContentTypes to this route if multipart is intentional",
    );
    throw new UnsupportedMediaTypeError(meta.contentType, allowed);
  }

  const limit = resolveMaxBodySize(meta.bodyKind);
  const rawContentLength = meta.headers.get("content-length");
  const declared =
    rawContentLength !== undefined && /^\d+$/.test(rawContentLength)
      ? Number(rawContentLength)
      : null;
  if (declared !== null && declared > limit) {
    throw new PayloadTooLargeError(limit, meta.contentType);
  }

  const result = await getData(
    res,
    meta.contentType,
    meta.headers,
    limit,
    abortSignal,
  );

  if (route.validator !== undefined && result.payload !== null) {
    const validate = route.validator as unknown as (input: unknown) => unknown;
    const validatedInput = validate(result.payload);

    if (validatedInput instanceof type.errors) {
      const summary =
        typeof validatedInput === "object" &&
        validatedInput !== null &&
        "summary" in validatedInput &&
        typeof validatedInput.summary === "string"
          ? validatedInput.summary
          : "";
      throw new ValidationError([summary]);
    }

    return { payload: validatedInput as Payload, files: result.files };
  }

  return { payload: null, files: result.files };
};

const sendResponse = (
  res: HttpResponse,
  responseData: ResponseData,
  requestOrigin: string | undefined,
): void => {
  res.writeStatus(String(responseData.status));
  // Skip JSON content-type for redirect responses (3xx)
  if (responseData.status < 300 || responseData.status >= 400) {
    res.writeHeader("content-type", "application/json");
  }
  setSecurityHeaders(res, responseData.headers);
  if (responseData.headers.length > 0) setHeaders(res, responseData.headers);
  if (responseData.cookies.size > 0) setCookies(res, responseData.cookies);
  if (corsConfig.enabled) setCorsHeader(res, requestOrigin);
  // && responseData.status >= 200 && responseData.status < 300
  if (responseData.status >= 300 && responseData.status < 400) {
    res.end();
  } else if (responseData.payload !== null) {
    res.end(makeJson(responseData.payload));
  } else res.end(String(responseData.status));
};

// interface State {
//   listenSocket: us_listen_socket | null;
// }

const handleError = (res: HttpResponse, error: unknown): void => {
  setSecurityHeaders(res);
  res.writeHeader("content-type", "application/json");
  if (error instanceof PayloadTooLargeError) {
    logger.warn(
      { limit: error.limit, contentType: error.contentType },
      "Payload too large",
    );
    res.writeStatus("413");
    res.end(
      JSON.stringify({
        message: "Payload too large",
        limit: error.limit,
        contentType: error.contentType,
      }),
    );
  } else if (error instanceof UnsupportedMediaTypeError) {
    logger.warn(
      {
        receivedContentType: error.receivedContentType,
        allowedKinds: error.allowedKinds,
      },
      "Unsupported media type",
    );
    res.writeStatus("415");
    res.end(
      JSON.stringify({
        message: "Unsupported Media Type",
        receivedContentType: error.receivedContentType,
        allowedKinds: error.allowedKinds,
      }),
    );
  } else if (error instanceof ValidationError) {
    logger.error({ err: error }, "Handle Error");
    res.writeStatus("422");
    res.end(
      JSON.stringify({
        message: "Validation failure",
        messages: error.messages,
      }),
    );
  } else if (error instanceof ParameterValidationError) {
    logger.error({ err: error }, "Handle Error");
    // Handle parameter validation errors with 400 Bad Request
    res.writeStatus("400");
    res.end(
      JSON.stringify({
        message: "Invalid parameter",
        parameter: error.parameterName,
        value: error.parameterValue,
        error: error.message,
      }),
    );
  } else {
    logger.error({ err: error }, "Handle Error");
    const errorMessage =
      configApp.env === "local" ? String(error) : "Internal server error";
    res.writeStatus("500");
    res.end(makeJson(errorMessage));
  }
};

const docRoutesHandler = async (
  res: HttpResponse,
  _: HttpRequest,
): Promise<void> => {
  return new Promise((resolve: () => void) => {
    if (
      state["listenSocket"] !== undefined &&
      configApp.env === "manual-test" &&
      configApp.docPage &&
      configApp.serveStatic
    ) {
      try {
        const serializedHttpRoutes = serializeRoutes(httpRoutes);
        const serializedWsRoutes = serializeRoutes(wsRoutes);

        res.cork(() => {
          res.writeStatus("200");
          res.writeHeader("content-type", "application/json");
          res.end(
            makeJson({
              httpRoutes: serializedHttpRoutes,
              wsRoutes: serializedWsRoutes,
              pathPrefix: appConfig.pathPrefix,
            }),
          );
        });
      } catch (err: unknown) {
        logger.error({ err }, "docRoutesHandler error");
        res.cork(() => {
          handleError(res, err);
        });
      }
    } else {
      res.cork(() => {
        res.writeStatus("404").end(makeJson({ message: "Not found" }));
      });
    }
    resolve();
  });
};

const setHttpHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  route: RouteItem,
): Promise<void> => {
  if (state["listenSocket"] === undefined) {
    logger.warn("We just refuse if already shutting down");
    res.close();
    return;
  }

  // Single onAborted registration — uWS res.onAborted() is a single slot,
  // re-registering replaces the previous handler. We wire readData via
  // RequestAbortSignal instead of calling res.onAborted() a second time.
  const abortSignal: RequestAbortSignal = { aborted: false };
  res.onAborted(() => {
    abortSignal.aborted = true;
    abortSignal.onAbort?.();
  });
  const responseData = getResponseData();
  let origin: string | undefined;

  try {
    // Step 1: snapshot req synchronously — it is only valid until the first await.
    const meta = collectRequestMetadata(req, res, route);
    origin = meta.headers.get("origin");

    // Step 2: rate-limit BEFORE reading body. Otherwise an attacker can make
    // the server buffer and parse up to maxOctetStreamBodySize even on blocked
    // routes, which is a DoS vector.
    //
    // Sync by design: если здесь будет `await`, uWS может доставить тело
    // маленьких POST-запросов до того, как readData зарегистрирует
    // res.onData(), и хендлер навсегда зависнет в pending.
    const rateLimitPassed = checkRateLimit(
      meta.ip,
      responseData,
      route,
      route.groupRateLimit,
    );

    if (!rateLimitPassed) {
      if (abortSignal.aborted) return;
      res.cork(() => {
        sendResponse(res, responseData, origin);
      });
      return;
    }

    // Step 3: now that the client is not rate-limited, read and parse the body.
    const { payload, files } = await readAndParseBody(
      res,
      meta,
      route,
      abortSignal,
    );

    // Step 4: middleware chain + handler.
    const httpData: HttpData = {
      ip: meta.ip,
      params: meta.params,
      payload,
      query: meta.query,
      headers: meta.headers,
      contentType: meta.contentType,
      cookies: meta.cookies,
      isJson: meta.hasBody && meta.bodyKind === "json",
      validator: route.validator,
      files,
      hasFile: (name: string): boolean => files?.has(name) ?? false,
    };
    const context = contextHandler(httpData, responseData, route.validator);

    if (
      (route.middlewares?.length === 0 ||
        (await executeMiddlewares(route.middlewares, context))) &&
      responseData.status >= 200 &&
      responseData.status < 300
    )
      responseData.payload = await route.handler(context);

    if (abortSignal.aborted) return;

    res.cork(() => {
      sendResponse(res, responseData, origin);
    });
  } catch (err: unknown) {
    if (abortSignal.aborted) return;
    logger.error({ err }, "Set Http Handler Error");
    res.cork(() => {
      handleError(res, err);
    });
  }
};

const configureHttp = async (server: TemplatedApp): Promise<void> => {
  if (appConfig.serveStatic) {
    const staticCache = await cacheStaticSource();
    if (staticCache !== null) {
      staticCache.forEach((value, key) => {
        server.get(key, async (res, req) => {
          await staticCacheHandler(res, req, value);
        });
      });
    }
  }

  getListRoutes().forEach((route: RouteItem) => {
    if (route.method !== "ws" && route.method !== "delete") {
      server[route.method](
        `/${normalizePath(route.url)}`,
        async (res: HttpResponse, req: HttpRequest) => {
          await setHttpHandler(res, req, route);
        },
      );
    }
  });
  if (
    configApp.env === "manual-test" &&
    configApp.docPage &&
    configApp.serveStatic
  ) {
    server.get(`/${appConfig.pathPrefix}/doc/routes`, async (res, req) => {
      await docRoutesHandler(res, req);
    });
  }

  server.any("/*", (res: HttpResponse, req: HttpRequest): void => {
    const url = req.getUrl();
    const method = req.getMethod();
    const origin = req.getHeader("origin");
    if (corsConfig.enabled && method === "options") {
      //'OPTIONS' method === 'OPTIONS'
      res.cork(() => {
        setCorsHeader(res, origin);
        res.writeStatus("200").end();
      });
    } else if (
      url.startsWith(`/${appConfig.pathPrefix}/`) &&
      method !== "options"
    ) {
      res.cork(() => {
        const data = "404 Not Found";
        const statusCode = "404";
        res.writeStatus(statusCode);
        res.end(data);
      });
    } else if (appConfig.serveStatic && method === "get") {
      staticHandler(res, req);
    } else {
      res.cork(() => {
        res.writeStatus("404").end(makeJson({ message: "Not found" }));
      });
    }
  });
};

const resolveAllowedOrigin = (
  requestOrigin: string | undefined,
): string | null => {
  if (requestOrigin === undefined || requestOrigin === "") return null;
  return corsConfig.allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : null;
};

const setCorsHeader = (
  res: HttpResponse,
  requestOrigin: string | undefined,
): void => {
  // Vary: Origin prevents intermediate caches from serving a CORS response
  // to an origin other than the one it was computed for.
  res.writeHeader("Vary", "Origin");
  const allowed = resolveAllowedOrigin(requestOrigin);
  if (allowed === null) return;
  res.writeHeader("Access-Control-Allow-Origin", allowed);
  res.writeHeader("Access-Control-Allow-Methods", corsConfig.methods);
  res.writeHeader("Access-Control-Max-Age", String(corsConfig.maxAge));
  res.writeHeader("Access-Control-Expose-Headers", corsConfig.exposeHeaders);
  res.writeHeader("Access-Control-Allow-Headers", corsConfig.allowHeaders);
  if (corsConfig.credentials) {
    res.writeHeader("Access-Control-Allow-Credentials", "true");
  }
};
// let server = null;
const initServer = async (): Promise<void> => {
  configureWebsockets(server);
  await configureHttp(server);
  if (appConfig.unixPath !== undefined) {
    server.listen_unix((token: us_listen_socket | false) => {
      if (token !== false) {
        logger.info(`Listening unix socket: ${appConfig.unixPath ?? ""}`);
        state["listenSocket"] = token;
      } else {
        logger.error(
          `Failed to listening unix socket: ${appConfig.unixPath ?? ""}`,
        );
      }
    }, appConfig.unixPath);
  } else {
    server.listen(
      appConfig.host,
      appConfig.port,
      (token: us_listen_socket | false) => {
        if (token !== false) {
          logger.info(
            `Listening http://${appConfig.host}:${String(appConfig.port)}`,
          );
          state["listenSocket"] = token;
        } else {
          logger.error(`Failed to listen to port ${String(appConfig.port)}`);
        }
      },
    );
  }
};

const stopServer = (type = "handle"): void => {
  logger.info(`server stop type: ${type}`);
  closeAllWs()
    .then(() => {
      if (state["listenSocket"] !== undefined)
        uWS.us_listen_socket_close(
          state["listenSocket"] as uWS.us_listen_socket,
        );
      state["listenSocket"] = undefined;
    })
    .catch((error: unknown) => {
      console.error(error);
    });
};

export { initServer, stopServer, broadcastToChannel };
