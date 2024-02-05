import logger from "#logger";
import {normalizePath} from "#start/httpRequestHandlers.js";

const getRoutes = [];
const postRoutes = [];

const createRoute = (url,handler) => {
    const route = {
        url: url,
        handler: handler,
        middlewares: [],
        validator: '',
        middleware: (middlewares)=> {
            route.middlewares = middlewares;
            return route;
        },
        validate: (validator)=>{
            route.validator = validator;
            return route;
        },
    }

    return route;
}
const router = {
    get(url,handler) {
        const route = createRoute(url,handler)
        getRoutes.push(route)

        return route;
    },
    post(url,handler) {
        const route = createRoute(url,handler)
        postRoutes.push(route)

        return route;
    },
    group(initRoutes){
        const groupRoutes = {
            routes: initRoutes,
            middleware: (middlewares)=> {
                groupRoutes.routes.forEach( route => {
                    route.middlewares.concat(middlewares);
                    return groupRoutes;
                })
            },
            prefix: (prefix)=> {
                groupRoutes.routes.forEach( route => {
                    route.url = `${normalizePath(prefix)}/${normalizePath(route.url)}`;
                    logger.info(route.url);
                    return groupRoutes;
                })
            },
        }

        return groupRoutes

    },
};

const getGetRoutes  = () => getRoutes;
const getPostRoutes  = () => postRoutes;

export {router, getGetRoutes, getPostRoutes};
