import logger from '#vendor/utils/logger.js';
import { normalizePath } from '#vendor/utils/network/http-request-handlers.js';
import appConfig from '#config/app.js';
import type { Method, RateLimit, RouteItem, WsRoutes, groupRouteItem } from '#vendor/types/types.js';

const listRoutes: RouteItem[] = [];
const wsRoutes: WsRoutes = {};

const parseRouteParams = (url: string): string[] =>
    url
        .split('/')
        .filter((segment) => segment.startsWith(':'))
        .map((segment) => segment.slice(1));

const createRoute = (
    method: Method,
    route: RouteItem,
    groupRateLimit: RateLimit | undefined,
): RouteItem => {
    const responseSchema = route.ResponseSchema;

    return {
        method,
        url: `${appConfig.pathPrefix}/${normalizePath(route.url)}`,
        handler: route.handler,
        middlewares: route.middlewares ?? [],
        validator: route.validator ?? undefined,
        rateLimit: route.rateLimit ?? groupRateLimit,
        groupRateLimit: groupRateLimit ?? undefined,
        parametersKey: parseRouteParams(route.url),
        description: route.description,
        allowedContentTypes: route.allowedContentTypes,
        ...(responseSchema !== undefined ? { ResponseSchema: responseSchema } : {}),
    };
};

const routeHandler = (
    route: RouteItem,
    isWs: boolean,
    groupRateLimit?: RateLimit,
): void => {

    let method = route.method;
    method = method === 'delete' ? 'del' : route.method;
    const newRoute = createRoute(method, route, groupRateLimit);
    if (isWs) wsRoutes[newRoute.url] = newRoute;
    else listRoutes.push(newRoute);
};

const routesHandler = (routeList: RouteItem[], isWs: boolean): void => {
    logger.info('routes Handler start');
    const parseRouteList = parseGroups(routeList, '', [], isWs, undefined);
    parseRouteList.forEach((route) => {
        routeHandler(route, isWs, route.groupRateLimit);
    });
};

const parseGroups = (
    routeList: RouteItem[] | groupRouteItem[],
    prefix: string,
    middlewares: string[],
    isWs: boolean,
    groupRateLimit: RateLimit | undefined,
): RouteItem[] => {
    const parseRouteList: RouteItem[] = [];
    routeList.forEach((route) => {
        if ("group" in route &&  Array.isArray(route.group) && route.group.length > 0) {
            const prefixInitial = normalizePath(prefix);
            const prefixGroup = normalizePath(route.prefix ?? '');
            const middlewaresGroup = route.middlewares !== undefined && Array.isArray(route.middlewares) && route.middlewares.length > 0
                ? middlewares.concat(route.middlewares)
                : middlewares;
            // Group limits are passed to subgroups
            const currentGroupRateLimit = route.rateLimit ?? groupRateLimit;
            const routeGroup = parseGroups(
                route.group,
                `${prefixInitial}/${prefixGroup}`,
                middlewaresGroup,
                isWs,
                currentGroupRateLimit,
            );
            routeGroup.forEach((item) => {
                parseRouteList.push(item);
            });
        } else if ("url" in route && "handler" in route) {
            if (prefix !== '') {
                route.url = `${prefix}/${normalizePath(route.url)}`;
            }
            if (middlewares.length > 0) {
                if (route.middlewares !== undefined && Array.isArray(route.middlewares)) {
                    route.middlewares = middlewares.concat(route.middlewares);
                } else {
                    route.middlewares = middlewares;
                }
            }
            // Add group rate limit information
            route.groupRateLimit = groupRateLimit;
            parseRouteList.push(route);
        }
    });
    return parseRouteList;
};
const getWsRoute = (nameRoute: string): RouteItem | undefined => wsRoutes[nameRoute];
const getWsRoutes = (): WsRoutes => wsRoutes;
const getListRoutes = (): RouteItem[] => listRoutes;
export { getWsRoute, getWsRoutes, getListRoutes, routesHandler };
