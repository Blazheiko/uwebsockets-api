import logger from '#logger';
import { normalizePath } from '#vendor/start/httpRequestHandlers.js';

const getRoutes = [];
const postRoutes = [];
const wsRoutes = {};

const createRoute = (url, handler) => {
    const route = {
        url: url,
        handler: handler,
        middlewares: [],
        validator: '',
        isWs: false,
        middleware: (middlewares) => {
            route.middlewares = middlewares;
            return route;
        },
        validate: (validator) => {
            route.validator = validator;
            return route;
        },
    };

    return route;
};
const router = {
    get(url, handler) {
        const route = createRoute(url, handler);
        getRoutes.push(route);

        return route;
    },
    post(url, handler) {
        const route = createRoute(url, handler);
        postRoutes.push(route);

        return route;
    },
    ws(event, handler) {
        const route = createRoute(event, handler);
        route.isWs = true;
        // if (wsRoutes[event]) throw new Error('Double ws route');
        wsRoutes[event] = route;

        return route;
    },
    group(initRoutes) {
        const groupRoutes = {
            routes: initRoutes,
            middleware: (middlewares) => {
                groupRoutes.routes.forEach((route) => {
                    route.middlewares.concat(middlewares);
                    if (route.isWs) wsRoutes[route.url] = route;
                    return groupRoutes;
                });
            },
            prefix: (prefix) => {
                groupRoutes.routes.forEach((route) => {
                    logger.info(route.url);
                    if (route.isWs) {
                        const oldKey = route.url;
                        route.url = prefix + route.url;
                        wsRoutes[route.url] = route;
                        delete wsRoutes[oldKey];
                    } else
                        route.url = `${normalizePath(prefix)}/${normalizePath(route.url)}`;
                    return groupRoutes;
                });
            },
        };

        return groupRoutes;
    },
};

const getGetRoutes = () => getRoutes;
const getPostRoutes = () => postRoutes;
const getWsRoutes = () => wsRoutes;

export { router, getGetRoutes, getPostRoutes, getWsRoutes };
