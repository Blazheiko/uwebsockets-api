import logger from '#logger';
import { normalizePath } from '#vendor/httpRequestHandlers.js';

const listRoutes = [];
const wsRoutes = {};

const createRoute = (method, route) => {
    return {
        method,
        url: route.url,
        handler: route.handler,
        middlewares: route.middlewares ? route.middlewares : [],
        validator: route.validator ? route.validator : '',
    };
};

const METHODS = ['get', 'post', 'del', 'put', 'patch'];

const routeHandler = (route, isWs) => {
    if (route.group) throw new Error('Error parse routes, route include group');
    if (!route.url || (!isWs && !route.method) || !route.handler)
        throw new Error(`Error parse routes. invalid route`);
    let method = 'ws';
    if (route.method) {
        method = route.method.toLocaleLowerCase();
        method = method === 'delete' ? 'del' : route.method;
    }
    if (!isWs && !METHODS.includes(method))
        throw new Error(`Error parse routes, route include method: ${method}`);

    if (isWs) wsRoutes[route.url] = createRoute(method, route);
    else listRoutes.push(createRoute(method, route));
};

const routesHandler = (routeList, isWs) => {
    logger.info('routes Handler start');
    const parseRouteList = parseGroups(routeList, '', [], isWs);
    parseRouteList.forEach((route) => {
        routeHandler(route, isWs);
    });
};

const parseGroups = (routeList, prefix, middlewares, isWs) => {
    const parseRouteList = [];
    routeList.forEach((route) => {
        if (route.group) {
            if (Array.isArray(route.group) && route.group.length) {
                const prefixGroup = route.prefix ? route.prefix : '';
                const middlewaresGroup = route.middlewares
                    ? route.middlewares
                    : [];
                const routeGroup = parseGroups(
                    route.group,
                    prefixGroup,
                    middlewaresGroup,
                    isWs,
                );
                routeGroup.forEach((item) => {
                    if (item.url && item.handler) parseRouteList.push(item);
                });
            }
        } else if (route.url && route.handler) {
            if (prefix) {
                if (isWs) route.url = `${prefix}${route.url}`;
                else route.url = `${prefix}/${normalizePath(route.url)}`;
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
            parseRouteList.push(route);
        }
    });
    return parseRouteList;
};

const getWsRoutes = () => wsRoutes;
const getListRoutes = () => listRoutes;

export { getWsRoutes, getListRoutes, routesHandler };
