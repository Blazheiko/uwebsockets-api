import logger from '#logger';

const getHeaders = (req) => {
    const headers = {};
    req.forEach((key, value) => {
        headers[key.toLowerCase()] = value.trim();
    });

    return headers;
};

const readJson = (res) => {
    logger.info('readJson');
    return new Promise((resolve, reject) => {
        let buffer = null;
        // resolve({
        //     name: 'Alex',
        //     email: 'test@email',
        //     password: '123456789',
        // });
        res.onData((ab, isLast) => {
            /* eslint-disable no-undef */

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
const normalizePath = (path) => {
    return path.startsWith('/') ? path.slice(1) : path;
};

const extractParameters = (template, path) => {
    const normalizedTemplate = normalizePath(template);
    const normalizedPath = normalizePath(path);

    const templateParts = normalizedTemplate.split('/');
    const pathParts = normalizedPath.split('/');
    const params = {};

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
