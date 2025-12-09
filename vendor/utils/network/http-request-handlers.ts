import logger from '#logger';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';

const getHeaders = (req: HttpRequest): Map<string, string> => {
    const headers: Map<string, string> = new Map();
    req.forEach((key, value) => {
        headers.set(key, value.trim());
    });

    return headers;
};

const parseFormDataStream = (body: string, boundary: string) => {
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
};

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
};

const readJson = (body: string) => {
    logger.info('readJson');
    if (!body) return {};
    try {
        return JSON.parse(body);
    } catch (e) {
        throw new Error('error parse json');
    }
};
const parseContentType = (contentType: string): string => {
    const boundaryIndex = contentType.indexOf('boundary=');
    if (boundaryIndex === -1)
        throw new Error('Boundary not found in Content-Type');

    const boundary = contentType.slice(boundaryIndex + 9).trim();

    return `--${boundary}`;
};

const getData = async (res: HttpResponse, contentType: string) => {
    let data = null;
    const buffer = await readData(res);
    if (buffer) {
        const body = buffer.toString();
        if (contentType === 'application/json') data = readJson(body);
        else if (contentType && contentType.startsWith('multipart/form-data'))
            data = parseFormDataStream(body, parseContentType(contentType));
    }

    return data;
};

const normalizePath = (path: string) => {
    if (!path) return '';
    let normalizedPath = path;
    if (normalizedPath.endsWith('/')) normalizedPath = normalizedPath.slice(0, -1);
    if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.slice(1);
    return normalizedPath;
};

const isValidUrl = (url: string): boolean => {
    // Check for multiple consecutive slashes (e.g., //, ///)
    return !/\/\/+/.test(url);
};

const extractParameters = (paramNames: string[], req: HttpRequest) => {
    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = req.getParameter(i) || '';
    }
    return params;
};

export { getHeaders, getData, extractParameters, normalizePath, isValidUrl };
