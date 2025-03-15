import {  WebSocket } from "uWebSockets.js";

export interface MyWebSocket extends WebSocket<any> {
  sendJson: (data: any) => void;
  timeout: NodeJS.Timeout,
  UUID: string,
  id: string,
}
export interface Header {
  name: string,
  value: string
}
export interface Cookie {
  name: string,
  value: string,
  path?: string,
  httpOnly?: boolean,
  secure?: boolean,
  expires?: Date,
  maxAge?: number,
  sameSite?: string,
}
export interface HttpContext {
  httpData: HttpData,
  responseData: ResponseData,
  session: Session,
  auth: any,
}
export interface WsContext {
  wsData: WsData,
  responseData: WsResponseData,
  session: Session | null,
  auth: any,
}

export interface Session {
  sessionInfo: SessionInfo | null,
  updateSessionData: Function;
  changeSessionData: Function;
  destroySession: Function;
};

export interface SessionData {
  [key: string]: any;
}

export interface SessionInfo {
  id: string;
  data: SessionData;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
}

export interface HttpData {
  params: object,
  payload: any,
  query: URLSearchParams
  headers: Map<string, string>,
  contentType: string | undefined,
  cookies: Map<string, string>,
  isJson: boolean,
}


export interface WsResponseData {
  payload: any,
  event: string,
  status: number,
}

export interface WsData {
  middlewareData: WsRoutes,
  status: string,
  payload?: any,
}

export interface ResponseData {
  aborted: boolean,
  payload: object,
  middlewareData: any,
  headers: header[],
  cookies: cookie[],
  status: string,
  setCookie: Function,
  setHeader: Function,
}

export type Method = 'get' | 'post' | 'del' | 'put' | 'patch' | 'ws' | 'delete'
export type WsRoutes = Record<string, routeItem>
export type Validators = Record<string, any>
export interface RouteItem {
  url: string,
  method: Method ,
  handler: Function,
  middlewares?: string[],
  validator?: string,
  description?: string,
}
export interface groupRouteItem {
  group: routeItem[],
  middleware?: string[],
  prefix?: string
}

export type routeList = (routeItem | groupRouteItem)[]
