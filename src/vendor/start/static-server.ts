import process from "node:process";
import path from "node:path";
import { promises as fs } from "node:fs";
// import logger from '#vendor/utils/logger.js';
import appConfig from "#config/app.js";
import cspConfig from "#config/csp.js";
import type { HttpRequest, HttpResponse } from "#vendor/start/server.js";
import { MIME_TYPES } from "#vendor/constants/index.js";
import { isBinaryExtension } from "#vendor/utils/helpers/file-utils.js";
import logger from "#vendor/utils/logger.js";
import state from "#app/state/state.js";
import type {
  Header,
  Cookie,
  HttpData,
  ResponseData,
  CookieOptions,
} from "#vendor/types/types.js";
import cookiesConfig from "#config/cookies.js";
import { parseCookies } from "#vendor/utils/network/http-request-handlers.js";
import { getHeaders } from "../utils/network/http-request-handlers.js";
import getIP from "#vendor/utils/network/get-ip.js";
import {
  setHeaders,
  setCookies,
  setSecurityHeaders,
} from "#vendor/utils/network/http-response-handlers.js";
import staticPageController from "#app/controllers/static/static-page-controller.js";

const STATIC_PATH =
  appConfig.env === "manual-test"
    ? path.join(process.cwd(), "./public-test")
    : path.join(process.cwd(), "./public");

const ALLOWED_STATIC_EXTENSIONS = new Set([
  "html", "htm",
  "css",
  "js", "mjs",
  "webmanifest", "manifest", "json",
  "txt", "xml",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif",
  "woff", "woff2", "ttf", "otf",
  "mp3", "mp4", "webm", "ogg", "oga", "wav",
]);

const isUrlSafe = (url: string): boolean =>
  !url.includes("..") &&
  !url.includes("\0") &&
  !url.toLowerCase().includes("%2e%2e") &&
  !url.includes("%00");

const cache = new Map<string, string | Buffer>();

const cacheFile = async (filePath: string): Promise<void> => {
  const ext = path.extname(filePath).substring(1).toLowerCase();
  if (!ALLOWED_STATIC_EXTENSIONS.has(ext)) return;
  const isBinary = isBinaryExtension(ext);
  const data = await fs.readFile(filePath, isBinary ? null : "utf8");
  const key = filePath.substring(STATIC_PATH.length);
  cache.set(key, data);
};

const cacheDirectory = async (directoryPath: string): Promise<void> => {
  const files = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const file of files) {
    if (file.name.startsWith(".")) continue;
    const filePath = path.join(directoryPath, file.name);
    if (file.isDirectory()) await cacheDirectory(filePath);
    else await cacheFile(filePath);
  }
};

const cacheStaticSource = async (): Promise<Map<
  string,
  string | Buffer
> | null> => {
  // logger.info('cachStaticSource');
  if (appConfig.serveStatic) {
    // logger.info('cache Directory ' + STATIC_PATH);
    await cacheDirectory(STATIC_PATH);
    // logger.info('Success cache Directory ' + STATIC_PATH);
    const indexHtml = cache.get("/index.html");
    if (indexHtml !== undefined && indexHtml !== "") {
      cache.set("/", indexHtml);
    }
    return cache;
  }
  return null;
};

const buildCspValue = (): string => {
  // Prefer full policy string if provided
  // const policy: unknown = (cspConfig as any)?.policy ?? (cspConfig as any)?.value;
  // if (typeof policy === 'string' && policy.trim().length > 0) return policy.trim();

  const directives = cspConfig.directives;
  if (typeof directives === "object") {
    const parts: string[] = [];
    for (const [name, val] of Object.entries(
      directives as Record<string, unknown>
    )) {
      if (Array.isArray(val)) {
        parts.push(`${name} ${val.join(" ")}`.trim());
      } else if (typeof val === "string") {
        parts.push(`${name} ${val}`.trim());
      } else if (val === true) {
        parts.push(name);
      }
    }
    return parts.join("; ").trim();
  }
  return "";
};

const cspHeaderValue: string = buildCspValue();
const cspHeaderName: string = cspConfig.reportOnly
  ? "Content-Security-Policy-Report-Only"
  : "Content-Security-Policy";
const isCspEnabled = Boolean(cspConfig.enabled && cspHeaderValue);

const setCspHeader = (res: HttpResponse): void => {
  if (!isCspEnabled) return;
  res.writeHeader(cspHeaderName, cspHeaderValue);
};

const staticIndexHandler = (res: HttpResponse): void => {
  const data = cache.get("/index.html");
  const statusCode = data !== undefined && data !== "" ? "200" : "404";
  const mimeType = MIME_TYPES["html"];
  res.cork(() => {
    res.writeStatus(statusCode);
    setCspHeader(res);
    if (mimeType !== undefined && mimeType !== "") {
      res.writeHeader("Content-Type", mimeType);
    }
    if (data !== undefined && data !== "") {
      res.end(data);
    } else {
      res.end("404 Not Found");
    }
  });
};

type StaticHttpData = Readonly<
  Omit<HttpData, "payload" | "params" | "contentType" | "isJson"> & {
    path: string;
    referer: string | undefined;
  }
>;

const getStaticHttpData = (
  req: HttpRequest,
  res: HttpResponse
): Readonly<StaticHttpData> => {
  const cookies = parseCookies(req.getHeader("cookie"));
  const url = req.getUrl();
  const query = new URLSearchParams(req.getQuery());
  const headers = getHeaders(req);
  // const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
  const ip = getIP(req, res);
  const referer = headers.get("referer");

  return {
    ip,
    query,
    headers,
    cookies,
    validator: undefined,
    path: url,
    referer: referer ?? undefined,
    files: null,
    hasFile: (): boolean => false,
  };
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
    options?: CookieOptions
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
const sendStaticResponse = (
  res: HttpResponse,
  responseData: ResponseData,
  htmlData: string | Buffer
): void => {
  res.writeStatus(String(responseData.status));
  // if (httpData.isJson) res.writeHeader('content-type', 'application/json');
  res.writeHeader("content-type", MIME_TYPES["html"] ?? "");
  setSecurityHeaders(res, responseData.headers);
  if (responseData.headers.length > 0) setHeaders(res, responseData.headers);
  if (responseData.cookies.size > 0) setCookies(res, responseData.cookies);
  res.end(htmlData);
};

const staticPageHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  htmlData: string | Buffer
): Promise<void> => {
  if (state['listenSocket'] !== undefined) {
    try {
      let aborted = false as boolean;
      res.onAborted(() => {
        aborted = true;
      });
      const httpData = getStaticHttpData(req, res);
      const responseData = getResponseData();

      const context = {
        httpData,
        responseData,
      };

      if (aborted) return;
      responseData.payload = htmlData;
      await staticPageController(context as Parameters<typeof staticPageController>[0]);

      res.cork(() => {
        sendStaticResponse(res, responseData, htmlData);
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: error }, "Set Http Handler Error");
      res.cork(() => {
        res.writeStatus("500");
        res.end("500 Internal Server Error");
      });
    }
  } else {
    logger.warn("We just refuse if already shutting down");
    res.close();
  }
};

const staticCacheHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  cachedData: string | Buffer
): Promise<void> => {

  const url = req.getUrl();
  const ext = url.includes(".")
    ? path.extname(url).substring(1).toLowerCase()
    : "";

  const mimeType =
    ext !== ""
      ? (MIME_TYPES[ext] ?? MIME_TYPES["default"])
      : MIME_TYPES["html"];

  // Add cache headers for better performance
  const maxAge = 31536000; // 1 year in seconds
  const isHtml = mimeType === MIME_TYPES["html"];

  // Generate ETag based on content hash for better caching
  const dataLength = Buffer.isBuffer(cachedData)
    ? cachedData.length
    : Buffer.byteLength(cachedData, "utf8");
  const etag = `"${String(dataLength)}-${url.replace(/[^a-zA-Z0-9]/g, "")}"`;

  // Check if client has cached version
  const ifNoneMatch = req.getHeader("if-none-match");
  if (!isHtml && ifNoneMatch === etag) {
    // Cache hit - file not modified
    // logger.info(`Cache hit for ${url} - returning 304`);
    res.cork(() => {
      res.writeStatus("304"); // Not Modified
      res.writeHeader(
        "Cache-Control",
        `public, max-age=${String(maxAge)}, immutable`
      );
      res.writeHeader("ETag", etag);
      res.end();
    });
    return;
  }
  if (mimeType === MIME_TYPES["html"]) {
    setCspHeader(res);
    await staticPageHandler(res, req, cachedData);
    return;
  }

  res.cork(() => {
    res.writeStatus("200");

    // Set appropriate headers
    if (mimeType !== undefined && mimeType !== "") {
      res.writeHeader("Content-Type", mimeType);
    }
    res.writeHeader("Content-Length", dataLength.toString());

    // For static assets, use longer cache time
    res.writeHeader(
      "Cache-Control",
      `public, max-age=${String(maxAge)}, immutable`
    );
    res.writeHeader("ETag", etag);

    // Add security headers
    res.writeHeader("X-Content-Type-Options", "nosniff");

    // Note: Compression not implemented yet
    // When adding compression support, add: res.writeHeader('Vary', 'Accept-Encoding');

    res.end(cachedData);
  });
};

const staticHandler = (res: HttpResponse, req: HttpRequest): void => {
  const url = req.getUrl();

  if (!isUrlSafe(url)) {
    res.cork(() => {
      res.writeStatus("400").end("Bad Request");
    });
    return;
  }

  let data: string | Buffer | null = null;
  let statusCode = "404";
  let mimeType = "";

  if (!url.includes(".")) {
    const indexHtml = cache.get("/index.html");
    data = indexHtml ?? null;
    statusCode = indexHtml !== undefined && indexHtml !== "" ? "200" : "404";
    mimeType =
      indexHtml !== undefined && indexHtml !== ""
        ? (MIME_TYPES["html"] ?? "")
        : "";
  }

  res.cork(() => {
    res.writeStatus(statusCode);
    res.writeHeader("Content-Type", mimeType);
    res.writeHeader("X-Content-Type-Options", "nosniff");
    res.end(data ?? "");
  });
};

export {
  cacheFile,
  cacheDirectory,
  cacheStaticSource,
  staticHandler,
  staticIndexHandler,
  staticCacheHandler,
};
