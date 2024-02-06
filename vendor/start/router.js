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
                    return groupRoutes;
                });
            },
            prefix: (prefix) => {
                groupRoutes.routes.forEach((route) => {
                    route.url = `${normalizePath(prefix)}/${normalizePath(route.url)}`;
                    logger.info(route.url);
                    if (route.isWs) {
                        logger.info('prefix ws route');
                    }
                    return groupRoutes;
                });
            },
        };

        return groupRoutes;
    },
};

const getGetRoutes = () => getRoutes;
const getPostRoutes = () => postRoutes;

export { router, getGetRoutes, getPostRoutes };
