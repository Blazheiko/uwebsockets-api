import logger from '#logger';
import { normalizePath } from '#vendor/utils/network/http-request-handlers.js';
import appConfig from '#config/app.js';
import { Method, RouteItem, WsRoutes } from './../types/types.js';

const listRoutes: RouteItem[] = [];
const wsRoutes: WsRoutes = {};

const parseRouteParams = (url: string) =>
    url
        .split('/')
        .filter((segment) => segment.startsWith(':'))
        .map((segment) => segment.slice(1));

const createRoute = (
    method: Method,
    route: any,
    groupRateLimit?: any,
    isWs?: boolean,
): RouteItem => {
    return {
        method,
        url: `${appConfig.pathPrefix}/${normalizePath(route.url)}`,
        // url: isWs
        //     ? `${appConfig.pathPrefix}${route.url}`
        //     : `${appConfig.pathPrefix}/${normalizePath(route.url)}`,
        handler: route.handler,
        middlewares: route.middlewares ? route.middlewares : [],
        validator: route.validator ? route.validator : '',
        rateLimit: route.rateLimit || groupRateLimit,
        groupRateLimit: groupRateLimit,
        parametersKey: parseRouteParams(route.url),
    };
};

const METHODS = ['get', 'post', 'del', 'put', 'patch'];

const routeHandler = (
    route: any,
    isWs: boolean,
    groupRateLimit?: any,
): void => {
    if (route.group) throw new Error('Error parse routes, route include group');
    if (!route.url || (!isWs && !route.method) || !route.handler)
        throw new Error(`Error parse routes. invalid route`);
    let method: Method = 'ws';
    if (route.method) {
        method = route.method.toLocaleLowerCase();
        method = method === 'delete' ? 'del' : route.method;
    }
    if (!isWs && !METHODS.includes(method))
        throw new Error(`Error parse routes, route include method: ${method}`);

    const newRoute = createRoute(method, route, groupRateLimit, isWs);

    if (isWs) wsRoutes[newRoute.url] = newRoute;
    else listRoutes.push(newRoute);
};

const routesHandler = (routeList: any[], isWs: boolean): void => {
    logger.info('routes Handler start');
    const parseRouteList = parseGroups(routeList, '', [], isWs, undefined);
    parseRouteList.forEach((route) => {
        routeHandler(route, isWs, route.groupRateLimit);
    });
};

const parseGroups = (
    routeList: any[],
    prefix: string,
    middlewares: string[],
    isWs: boolean,
    groupRateLimit?: any,
) => {
    const parseRouteList: any[] = [];
    routeList.forEach((route) => {
        if (route.group) {
            if (Array.isArray(route.group) && route.group.length) {

                const prefixInitial = normalizePath(prefix || '');
                const prefixGroup = normalizePath(route.prefix || '');
                const middlewaresGroup = route.middlewares
                    ? middlewares.concat(route.middlewares)
                    : middlewares;
                // Group limits are passed to subgroups
                const currentGroupRateLimit = route.rateLimit || groupRateLimit;
                const routeGroup = parseGroups(
                    route.group,
                    `${prefixInitial}/${prefixGroup}`,
                    middlewaresGroup,
                    isWs,
                    currentGroupRateLimit,
                );
                routeGroup.forEach((item) => {
                    if (item.url && item.handler) parseRouteList.push(item);
                });
            }
        } else if (route.url && route.handler) {
            if (prefix) {
                route.url = `${prefix}/${normalizePath(route.url)}`;
                // if (isWs) route.url = `${prefix}${route.url}`;
                // else route.url = `${prefix}/${normalizePath(route.url)}`;
            }
            if (middlewares && middlewares.length) {
                if (!route.middlewares || !Array.isArray(route.middlewares))
                    route.middlewares = [];
                if (
                    middlewares &&
                    Array.isArray(middlewares) &&
                    middlewares.length
                )
                    route.middlewares = middlewares.concat(route.middlewares);
            }
            // Add group rate limit information
            route.groupRateLimit = groupRateLimit;
            parseRouteList.push(route);
        }
    });
    return parseRouteList;
};

const getWsRoutes = (): WsRoutes => wsRoutes;
const getListRoutes = (): RouteItem[] => listRoutes;

export { getWsRoutes, getListRoutes, routesHandler };
