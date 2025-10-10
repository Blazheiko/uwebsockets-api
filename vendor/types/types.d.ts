import { WebSocket } from 'uWebSockets.js';
import { Logger } from 'pino';

export interface MyWebSocket extends WebSocket<any> {
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
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    expires?: Date;
    maxAge?: number;
    sameSite?: string;
}
export interface HttpContext {
    requestId: string;
    logger: Logger;
    httpData: HttpData;
    responseData: ResponseData;
    session: Session;
    auth: any;
}
export interface WsContext {
    requestId: string;
    wsData: WsData;
    responseData: WsResponseData;
    session: Session | null;
    auth: any;
    logger: Logger;
}

export interface Auth {
    getUserId: Function;
    check: Function;
    login: Function;
    logout: Function;
    logoutAll: Function;
}

export interface Session {
    sessionInfo: SessionInfo | null;
    updateSessionData: Function;
    changeSessionData: Function;
    destroySession: Function;
}

export interface SessionData {
    [key: string]: any;
}

export interface SessionInfo {
    id: string;
    data: SessionData;
    createdAt: string;
    updatedAt?: string;
    // expiresAt: string;
}

export interface HttpData {
    ip: string | null | undefined;
    params: any;
    payload: any;
    query: URLSearchParams;
    headers: Map<string, string>;
    contentType: string | undefined;
    cookies: Map<string, string>;
    isJson: boolean;
}

export interface WsResponseData {
    payload: any;
    event: string;
    status: number;
}

export interface WsData {
    middlewareData: any;
    status: string;
    payload?: any;
}

export interface ResponseData {
    aborted: boolean;
    payload: object;
    middlewareData: any;
    headers: header[];
    cookies: Record<string, Cookie>;
    status: number;
    deleteCookie: Function;
    setCookie: Function;
    setHeader: Function;
}

export type Method = 'get' | 'post' | 'del' | 'put' | 'patch' | 'ws' | 'delete';
export type WsRoutes = Record<string, RouteItem>;
export type Validators = Record<string, any>;
export interface RateLimit {
    windowMs: number;
    maxRequests: number;
}

export interface RouteItem {
    url: string;
    method: Method;
    handler: Function;
    middlewares?: string[];
    validator?: string;
    description?: string;
    rateLimit?: RateLimit;
    groupRateLimit?: RateLimit;
    parametersKey: string[];
    response?: ResponseSchema;
    requestBody?: RequestSchema;
}

export interface ResponseSchema {
    type: string; // Name of the response type
    description?: string;
    example?: any;
    schema?: Record<string, SchemaField>;
}

export interface RequestSchema {
    description?: string;
    example?: any;
    schema?: Record<string, SchemaField>;
}

export interface SchemaField {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    required?: boolean;
    example?: any;
    items?: SchemaField; // For arrays
    properties?: Record<string, SchemaField>; // For objects
}
export interface groupRouteItem {
    group: RouteItem[];
    middlewares?: string[];
    prefix?: string;
    rateLimit?: RateLimit;
}

// Legacy alias for backward compatibility
export type routeItem = RouteItem;

export type routeList = (routeItem | groupRouteItem)[];
