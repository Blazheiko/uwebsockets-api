import logger from '#logger';
import { normalizePath } from '#vendor/httpRequestHandlers.js';

const getRoutes = [];
const postRoutes = [];
const listRoutes = [];
const wsRoutes = {};

const createRoute = (method, route) => {
    return {
        method,
        url: route.url,
        handler: route.handler,
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
};
const router = {
    addRoute(method, route) {
        listRoutes.push(createRoute(method, route));
    },
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
        wsRoutes[event] = route;

        return route;
    },
    group(initRoutes) {
        const groupRoutes = {
            routes: initRoutes,
            middleware: (middlewares) => {
                groupRoutes.routes.forEach((route) => {
                    route.middlewares = route.middlewares.concat(middlewares);
                    // console.log(route.middlewares);
                    if (route.isWs) wsRoutes[route.url] = route;
                });
                return groupRoutes;
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
                });
                return groupRoutes;
            },
        };

        return groupRoutes;
    },
};
const METHODS = ['get', 'post', 'del', 'put', 'patch'];

const routeHandler = (route) => {
    if (route.group) {
        routesHandler(route.group);
        return;
    }
    if (!route.url || !route.method || !route.handler) {
        logger.error('Error handle route');
        return;
    }
    let method = route.method.toLocaleLowerCase();
    method = method === 'delete' ? 'del' : route.method;
    if (!METHODS.includes(method)) {
        logger.error(`Error handle. Method ${method} do not support`);
        return;
    }

    router.addRoute(method, route);
};

const routesHandler = (routeList) => {
    routeList.forEach((route) => {
        routeHandler(route);
    });
};

const getGetRoutes = () => getRoutes;
const getPostRoutes = () => postRoutes;
const getWsRoutes = () => wsRoutes;
const getListRoutes = () => listRoutes;

export {
    router,
    getGetRoutes,
    getPostRoutes,
    getWsRoutes,
    getListRoutes,
    routesHandler,
};
