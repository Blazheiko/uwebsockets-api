import type { WebSocket } from "uWebSockets.js";
import type { Logger } from "pino";
import type { BaseType } from "@arktype/type";
import type { BodyKind } from '../utils/network/http-request-handlers.js';
// import type { UserData } from '#vendor/start/server.js';

export type Payload =
  | Record<string, unknown>
  | string
  | Buffer
  | number
  | boolean
  | bigint
  | null;

export type Params = Record<string, string>;

export type ValidatorFunction = (payload: Payload) => Promise<Payload>;

export interface UserConnection extends Record<string, unknown> {
  ip: string;
  userAgent: string;
  ip2: string;
  token: string;
  user: unknown;
  role?: "user" | "admin" | "partner";
  appType: "web" | "pwa";
  isAdminChannelSubscribed?: boolean;
  uuid: string;
  sessionId: string | undefined;
  userId: string | undefined;
  userToken: string | undefined;
  timeStart: number;
  videoCallId?: string;
  videoCallPeerUserId?: string;
}

export interface MyWebSocket extends WebSocket<UserConnection> {
  // sendJson: (data: any) => void;
  // timeout: NodeJS.Timeout,
  // UUID: string,
  id: string;
}
export interface Header {
  name: string;
  value: string;
}
export interface Cookie {
  name: string;
  value: string;
  path: string | undefined;
  httpOnly: boolean | undefined;
  secure: boolean | undefined;
  expires: Date | undefined;
  maxAge: number | undefined;
  sameSite: string | undefined;
}

export interface HttpContext<TPayload = unknown> {
  requestId: string;
  logger: Logger;
  httpData: HttpData<TPayload>;
  validator: BaseType | undefined;
  responseData: ResponseData;
  session: Session;
  auth: Auth;
}
export interface WsContext<TPayload = unknown> {
  requestId: string;
  ws: MyWebSocket;
  wsData: WsData<TPayload>;
  validator: BaseType | undefined;
  responseData: WsResponseData;
  session: null;
  auth: null;
  logger: Logger;
}

export type WsMiddleware = (
  context: WsContext,
  next: () => Promise<void>,
) => Promise<void>;

export type Middleware = (
  context: HttpContext,
  next: () => Promise<void>,
) => Promise<void>;

export interface Auth {
  getUserId: () => string | null;
  check: () => boolean;
  login: (userId: string | undefined, userToken: string | undefined) => Promise<boolean>;
  logout: () => Promise<boolean>;
  logoutAll: () => Promise<number>;
}

export interface Session {
  sessionInfo: SessionInfo | null;
  updateSessionData: (newData: SessionData) => Promise<SessionInfo | null>;
  changeSessionData: (newData: SessionData) => Promise<SessionInfo | null>;
  destroySession: (sessionId: string | undefined) => Promise<void>;
  destroyAllSessions: (userId: string) => Promise<number>;
}

export interface SessionData extends Record<string, unknown> {
  userId?: string;
  userToken?: string;
  wsToken?: string;
}

export interface SessionInfo {
  id: string;
  data: SessionData;
  createdAt: string;
  updatedAt?: string;
  // expiresAt: string;
}

export interface UploadedFile {
  name: string;
  filename: string;
  type: string;
  data: ArrayBuffer;
}

export interface HttpData<TPayload = unknown> {
  ip: string | null | undefined;
  params: Params;
  payload: TPayload | null;
  query: URLSearchParams;
  headers: Map<string, string>;
  contentType: string | undefined;
  cookies: Map<string, string>;
  isJson: boolean;
  validator: BaseType | undefined;
  files: Map<string, UploadedFile> | null;
  hasFile: (name: string) => boolean;
}

export interface ErrorResponse {
  code: number;
  message: string;
  messages?: Record<string, unknown> | string[] | string;
}

export interface WsMessage {
  payload: Record<string, unknown> | null;
  event: string;
  timestamp: number;
}

export interface WsResponseData {
  data: Payload | null;
  error: ErrorResponse | null;
  event: string;
  status: string;
  timestamp: number;
}

export interface WsData<TPayload = unknown> {
  ws: MyWebSocket;
  middlewareData: Record<string, unknown>;
  status: string;
  payload: TPayload | Payload;
}

export interface CookieOptions {
  path: string | undefined;
  httpOnly: boolean | undefined;
  secure: boolean | undefined;
  maxAge: number | undefined;
  sameSite: string | undefined;
  expires: Date | undefined;
}

export interface ResponseData {
  aborted: boolean;
  payload: Payload | null;
  middlewareData: Record<string, unknown>;
  headers: Header[];
  cookies: Map<string, Cookie>;
  status: number;
  deleteCookie: (name: string) => void;
  setCookie: {
    (name: string, value: string, options?: CookieOptions): void;
    (cookie: Cookie): void;
  };
  setHeader: (name: string, value: string) => void;
}

export type Method = "get" | "post" | "del" | "put" | "patch" | "ws" | "delete";
export type WsRoutes = Record<string, RouteItem>;
export type Validators = Record<string, Record<string, unknown>>;
export interface RateLimit {
  windowMs: number;
  maxRequests: number;
}

// Helper type to infer payload type from arktype schema
export type InferPayload<T> = T extends BaseType<infer U, unknown> ? U : unknown;

// Handler types for routes
export type HandlerReturn = Promise<Payload> | Payload;
type BivariantHandler<TContext> = {
  bivarianceHack(context: TContext): HandlerReturn;
}["bivarianceHack"];

export type RouteHandler<TPayload = unknown> = BivariantHandler<
  HttpContext<TPayload> | WsContext<TPayload>
>;
export type HttpHandler<TPayload = unknown> = BivariantHandler<
  HttpContext<TPayload>
>;
export type WsHandler<TPayload = unknown> = BivariantHandler<
  WsContext<TPayload>
>;

// Controller type - allows handlers that accept narrower context types
export type HttpController = Record<string, HttpHandler>;
export type WsController = Record<string, WsHandler>;

// Base route configuration without handler (for defineRoute)
export interface RouteConfig<TValidator extends BaseType | undefined = undefined> {
  url: string;
  method: Method;
  middlewares?: string[] | undefined;
  validator?: TValidator | undefined;
  description?: string | undefined;
  rateLimit?: RateLimit | undefined;
  groupRateLimit?: RateLimit | undefined;
  parametersKey?: string[];
  requestBody?: RequestSchema;
  ResponseSchema?: BaseType | undefined;
  /** Allowed request body Content-Type kinds. Defaults to ['json'] for POST/PUT routes. */
  allowedContentTypes?: BodyKind[] | undefined;
}

// RouteItem with handler - uses function overload pattern for type erasure
export interface RouteItem<
  TValidator extends BaseType | undefined = BaseType | undefined,
> extends RouteConfig<TValidator> {
  handler: TValidator extends BaseType
    ? RouteHandler<InferPayload<TValidator>>
    : RouteHandler;
}


export interface ResponseSchema {
  type: string; // Name of the response type
  description?: string;
  example?: Record<string, unknown>;
  schema?: Record<string, SchemaField>;
}

export interface RequestSchema {
  description?: string;
  example?: Record<string, unknown>;
  schema?: Record<string, SchemaField>;
}

export interface SchemaField {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  example?: Record<string, unknown>;
  items?: SchemaField; // For arrays
  properties?: Record<string, SchemaField>; // For objects
}
export interface groupRouteItem {
  group: RouteItem[];
  middlewares?: string[];
  prefix?: string;
  rateLimit?: RateLimit;
  description: string;
  prefix: string;
}

export interface WebSocketConnectionEvent {
  userId: string;
  sessionId: string;
  uuid: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  ws: MyWebSocket;
}

export interface WebSocketDisconnectionEvent {
  userId: string;
  sessionId: string;
  uuid: string;
  code: number;
  timestamp: number;
}
// Legacy alias for backward compatibility
export type routeItem = RouteItem;

export type routeList = (routeItem | groupRouteItem)[];
