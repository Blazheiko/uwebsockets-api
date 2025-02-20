import {  WebSocket } from "uWebSockets.js";

export interface MyWebSocket extends WebSocket<any> {
  sendJson: (data: any) => void;
  timeout: NodeJS.Timeout,
  UUID: string,
  id: string,
}
export interface header {
  name: string,
  value: string
}
export interface cookie {
  name: string,
  value: string,
  path: string,
  httpOnly: boolean,
  secure: boolean,
  expires: string
  maxAge: number,
}
export interface HttpData {
  params: object,
  payload: any,
  query: object,
  headers: object,
  contentType: string,
  cookies: object,
  isJson: boolean,
}

export interface ResponseData {
  payload: object,
  middlewareData: object,
  headers: header[],
  cookies: cookie[],
  status: string,
  setCookie: Function,
  setHeader: Function,
}
export type Method = 'get' | 'post' | 'del' | 'put' | 'patch' | 'ws' | 'delete'
export type WsRoutes = Record<string, routeItem>
export type Validators = Record<string, any>
export interface routeItem {
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
