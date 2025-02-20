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

export interface routeItem {
  url: string,
  method: 'get' | 'post' | 'del' | 'put' | 'patch' ,
  handler: Function,
  middleware?: string[],
  validate?: string,
  description?: string,
}
export interface groupRouteItem {
  group: routeItem[],
  middleware?: string[],
  prefix?: string
}

export type routeList = (routeItem | groupRouteItem)[]
