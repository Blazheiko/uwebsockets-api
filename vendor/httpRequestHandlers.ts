import logger from '#logger';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';

const getHeaders = (req: HttpRequest): Map<string, string> => {
    const headers: Map<string, string> = new Map();
    req.forEach((key, value) => {
        headers.set(key,value.trim())
    });

    return headers;
};

const parseFormDataStream = (body: string, boundary: string)=> {
    let result: Record<string, string> = {};
    let start = 0;

    while ((start = body.indexOf(boundary, start)) !== -1) {
        const nameStart = body.indexOf('name="', start);
        if (nameStart === -1) break;

        const nameEnd = body.indexOf('"', nameStart + 6);
        const fieldName = body.slice(nameStart + 6, nameEnd);

        const valueStart = body.indexOf('\r\n\r\n', nameEnd) + 4;
        const valueEnd = body.indexOf('\r\n--', valueStart);

        result[fieldName] = body.slice(valueStart, valueEnd).trim();

        start = valueEnd;
    }

    return result;
}

const readData = (res: HttpResponse) => {
    logger.info('readData');
    return new Promise((resolve, reject) => {
        let buffer: Buffer | null = null;
        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab);

            if (buffer) buffer = Buffer.concat([buffer, chunk]);
            else buffer = Buffer.concat([chunk]);

            if (isLast) return resolve(buffer);
        });
    });
}

const readJson = (body: string) => {
    logger.info('readJson');
    try {
        return JSON.parse( body );
    } catch (e) {
        throw new Error('error parse json');
    }
    // return new Promise((resolve, reject) => {
    //     let buffer: any = null;
    //     res.onData((ab, isLast) => {
    //
    //         let chunk = Buffer.from(ab);
    //         if (isLast) {
    //             let json = null;
    //             try {
    //                 if (buffer)
    //                     json = JSON.parse(
    //                         Buffer.concat([buffer, chunk]).toString(),
    //                     );
    //                 else json = JSON.parse(chunk.toString());
    //             } catch (e) {
    //                 return reject('error parse json');
    //             }
    //             logger.info('end parse json');
    //
    //             return resolve(json);
    //         } else {
    //             if (buffer) buffer = Buffer.concat([buffer, chunk]);
    //             else buffer = Buffer.concat([chunk]);
    //         }
    //     });
    // });
};
const parseContentType = (contentType: string): string => {
    const boundaryIndex = contentType.indexOf('boundary=');
    if (boundaryIndex === -1)
        throw new Error('Boundary not found in Content-Type');

    const boundary = contentType.slice(boundaryIndex + 9).trim();

    return `--${boundary}`;
}

const getData = async (res: HttpResponse , contentType: string) => {
    let data = null;
    const buffer = await readData(res);
    if(buffer){
        const body = buffer.toString();
        if (contentType === 'application/json') data = readJson(body);
        else if(contentType && contentType.startsWith('multipart/form-data'))
            data = parseFormDataStream(body, parseContentType(contentType))
    }

    return data;
}


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

export { getHeaders, getData, extractParameters, normalizePath };
