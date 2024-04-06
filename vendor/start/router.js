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
        middlewares: route.middlewares ? route.middlewares : [],
        validator: route.validator ? route.validator : '',
        isWs: false,
        // middleware: (middlewares) => {
        //     route.middlewares = middlewares;
        //     return route;
        // },
        // validate: (validator) => {
        //     route.validator = validator;
        //     return route;
        // },
    };
};
// const router = {
//     // addRoute(method, route) {
//     //     listRoutes.push(createRoute(method, route));
//     // },
//     get(url, handler) {
//         const route = createRoute(url, handler);
//         getRoutes.push(route);
//
//         return route;
//     },
//     post(url, handler) {
//         const route = createRoute(url, handler);
//         postRoutes.push(route);
//
//         return route;
//     },
//     ws(event, handler) {
//         const route = createRoute(event, handler);
//         route.isWs = true;
//         wsRoutes[event] = route;
//
//         return route;
//     },
//     group(initRoutes) {
//         const groupRoutes = {
//             routes: initRoutes,
//             middleware: (middlewares) => {
//                 groupRoutes.routes.forEach((route) => {
//                     route.middlewares = route.middlewares.concat(middlewares);
//                     // console.log(route.middlewares);
//                     if (route.isWs) wsRoutes[route.url] = route;
//                 });
//                 return groupRoutes;
//             },
//             prefix: (prefix) => {
//                 groupRoutes.routes.forEach((route) => {
//                     logger.info(route.url);
//                     if (route.isWs) {
//                         const oldKey = route.url;
//                         route.url = prefix + route.url;
//                         wsRoutes[route.url] = route;
//                         delete wsRoutes[oldKey];
//                     } else
//                         route.url = `${normalizePath(prefix)}/${normalizePath(route.url)}`;
//                 });
//                 return groupRoutes;
//             },
//         };
//
//         return groupRoutes;
//     },
// };
const METHODS = ['get', 'post', 'del', 'put', 'patch'];

const routeHandler = (route) => {
    if (route.group) throw new Error('Error parse routes, route include group');
    if (!route.url || !route.method || !route.handler)
        throw new Error(`Error parse routes. invalid route`);
    let method = route.method.toLocaleLowerCase();
    method = method === 'delete' ? 'del' : route.method;
    if (!METHODS.includes(method))
        throw new Error(`Error parse routes, route include method: ${method}`);

    listRoutes.push(createRoute(method, route));
};

const routesHandler = (routeList) => {
    const parseRouteList = parseGroups(routeList, '', []);
    parseRouteList.forEach((route) => {
        routeHandler(route);
    });
    console.log(listRoutes);
};

const parseGroups = (routeList, prefix, middlewares) => {
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
                );
                routeGroup.forEach((item) => {
                    if (item.url && item.handler && item.method)
                        parseRouteList.push(item);
                });
            }
        } else {
            if (prefix) {
                routeList.forEach((route) => {
                    route.url = `${prefix}/${normalizePath(route.url)}`;
                });
            }
            if (middlewares && middlewares.length) {
                routeList.forEach((route) => {
                    if (!route.middlewares || !Array.isArray(route.middlewares))
                        route.middlewares = [];
                    if (
                        middlewares &&
                        Array.isArray(middlewares) &&
                        middlewares.length
                    )
                        route.middlewares = middlewares.concat(
                            route.middlewares,
                        );
                });
            }
            parseRouteList.push(route);
        }
    });
    return parseRouteList;
};

const getGetRoutes = () => getRoutes;
const getPostRoutes = () => postRoutes;
const getWsRoutes = () => wsRoutes;
const getListRoutes = () => listRoutes;

export {
    getGetRoutes,
    getPostRoutes,
    getWsRoutes,
    getListRoutes,
    routesHandler,
};
