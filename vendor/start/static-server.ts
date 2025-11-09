import process from 'node:process';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import logger from '#logger';
import appConfig from '#config/app.js';
import cspConfig from '#config/csp.js';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';

const STATIC_PATH = appConfig.env === 'manual-test' ? 
    path.join(process.cwd(), './public-test') : 
    path.join(process.cwd(), './public');

const cache = new Map();

const MIME_TYPES: Record<string, string> = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    js: 'application/javascript; charset=UTF-8',
    json: 'application/json',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    woff: 'application/font-woff',
    woff2: 'application/font-woff2',
    ttf: 'application/x-font-ttf',
};
const cacheFile = async (filePath: string) => {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const isBinary = [
        'ico',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'svg',
        'woff',
        'woff2',
        'ttf',
    ].includes(ext);
    const data = await fs.readFile(filePath, isBinary ? null : 'utf8');
    const key = filePath.substring(STATIC_PATH.length);
    cache.set(key, data);
    logger.info(`Cached file: ${key} (${isBinary ? 'binary' : 'text'})`);
};

const cacheDirectory = async (directoryPath: string) => {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(directoryPath, file.name);
        if (file.isDirectory()) cacheDirectory(filePath);
        else cacheFile(filePath);
    }
};

const startStaticServer = () => {
    if (appConfig.serveStatic) {
        logger.info('cache Directory ' + STATIC_PATH);
        cacheDirectory(STATIC_PATH).then(() => {
            logger.info('Success cache Directory ' + STATIC_PATH);
        });
    }
};
const staticRoutes = [
    '/',
    '/chat',
    '/login',
    '/register',
    '/chat',
    '/account',
    '/news',
    '/news/create',
    '/news/edit',
    '/news/:id',
    '/manifesto',
];

const buildCspValue = (): string => {
    // Prefer full policy string if provided
    // const policy: unknown = (cspConfig as any)?.policy ?? (cspConfig as any)?.value;
    // if (typeof policy === 'string' && policy.trim().length > 0) return policy.trim();

    const directives: unknown = (cspConfig as any)?.directives;
    if (directives && typeof directives === 'object') {
        const parts: string[] = [];
        for (const [name, val] of Object.entries(
            directives as Record<string, unknown>,
        )) {
            if (Array.isArray(val)) {
                parts.push(`${name} ${val.join(' ')}`.trim());
            } else if (typeof val === 'string') {
                parts.push(`${name} ${val}`.trim());
            } else if (val === true) {
                parts.push(`${name}`);
            }
        }
        return parts.join('; ').trim();
    }
    return '';
};

const cspHeaderValue: string = buildCspValue();
const cspHeaderName: string = (cspConfig as any)?.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
const isCspEnabled: boolean = Boolean(
    (cspConfig as any)?.enabled && cspHeaderValue,
);

const setCspHeader = (res: HttpResponse) => {
    if (!isCspEnabled) return;
    res.writeHeader(cspHeaderName, cspHeaderValue);
};

const staticIndexHandler = (res: HttpResponse, req: HttpRequest) => {
    let data = cache.get('/index.html');
    let statusCode = data ? '200' : '404';
    let mimeType = MIME_TYPES.html;
    res.cork(() => {
        res.writeStatus(statusCode);
        setCspHeader(res);
        res.writeHeader('Content-Type', mimeType);
        res.end(data || '');
    });
};
const staticHandler = (res: HttpResponse, req: HttpRequest) => {
    let data: string | Buffer | null = null;
    let statusCode = '404';
    let mimeType = '';
    const url = req.getUrl();
    const ext = path.extname(url).substring(1).toLowerCase();
    logger.info(`Static handler request: ${url}, ext: ${ext}`);
    if (ext) {
        mimeType = MIME_TYPES[ext] || MIME_TYPES.html;
        data = cache.get(url);
        statusCode = '200';
        if (!data) {
            statusCode = '404';
            data = cache.get('/404.html');
            logger.warn(`File not found in cache: ${url}`);
        } else {
            logger.info(`Serving file from cache: ${url}`);
        }
    }

    res.cork(() => {
        res.writeStatus(statusCode);
        if (ext === 'html') setCspHeader(res);
        res.writeHeader('Content-Type', mimeType);
        res.end(data || '');
    });
};

export {
    cacheFile,
    cacheDirectory,
    startStaticServer,
    staticHandler,
    staticIndexHandler,
};
