import logger from '#logger';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';

const getHeaders = (req: HttpRequest): Map<string, string> => {
    const headers: Map<string, string> = new Map();
    req.forEach((key, value) => {
        headers.set(key,value.trim())
    });

    return headers;
};

const readJson = (res: HttpResponse) => {
    logger.info('readJson');
    return new Promise((resolve, reject) => {
        let buffer: any = null;
        res.onData((ab, isLast) => {

            let chunk = Buffer.from(ab);
            if (isLast) {
                let json = null;
                try {
                    if (buffer)
                        json = JSON.parse(
                            Buffer.concat([buffer, chunk]).toString(),
                        );
                    else json = JSON.parse(chunk.toString());
                } catch (e) {
                    return reject('error parse json');
                }
                logger.info('end parse json');

                return resolve(json);
            } else {
                if (buffer) buffer = Buffer.concat([buffer, chunk]);
                else buffer = Buffer.concat([chunk]);
            }
        });
    });
};
const normalizePath = (path: string) => {
    return path.startsWith('/') ? path.slice(1) : path;
};

const extractParameters = (template: string, path: string) => {
    const normalizedTemplate = normalizePath(template);
    const normalizedPath = normalizePath(path);

    const templateParts = normalizedTemplate.split('/');
    const pathParts = normalizedPath.split('/');
    const params: Record<string, string> = {};

    if (templateParts.length !== pathParts.length) {
        throw new Error('Path does not match the template');
    }

    for (let i = 0; i < templateParts.length; i++) {
        const templatePart = templateParts[i];
        const pathPart = pathParts[i];

        if (templatePart.startsWith(':')) {
            const paramName = templatePart.slice(1);
            params[paramName] = pathPart;
        } else if (templatePart !== pathPart) {
            throw new Error(
                `Path segment "${pathPart}" does not match the template segment "${templatePart}"`,
            );
        }
    }

    return params;
};

export { getHeaders, readJson, extractParameters, normalizePath };
