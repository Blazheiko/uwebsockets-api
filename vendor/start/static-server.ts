import process from 'node:process';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import logger from '#logger';
import appConfig from '#config/app.js';
import cspConfig from '#config/csp.js';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';

const STATIC_PATH =
    appConfig.env === 'manual-test'
        ? path.join(process.cwd(), './public-test')
        : path.join(process.cwd(), './public');

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
        'webp',
        'mp4',
        'mp3',
        'ogg',
        'wav',
        'webm',
        'avi',
        'mov',
        'flv',
        'wmv',
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
        if (file.isDirectory()) await cacheDirectory(filePath);
        else await cacheFile(filePath);
    }
};

const startStaticServer = async () => {
    if (appConfig.serveStatic) {
        logger.info('cache Directory ' + STATIC_PATH);
        await cacheDirectory(STATIC_PATH);
        logger.info('Success cache Directory ' + STATIC_PATH);
        const indexHtml = cache.get('/index.html');
        if (indexHtml) {
            cache.set('/', indexHtml);
        }
        return cache;
    }
    return null;
};

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

const staticCacheHandler = (
    res: HttpResponse,
    req: HttpRequest,
    cachedData: string | Buffer,
) => {
    const url = req.getUrl();
    const ext =
        url.indexOf('.') !== -1
            ? path.extname(url).substring(1).toLowerCase()
            : '';

    const mimeType = ext
        ? MIME_TYPES[ext] || MIME_TYPES.default
        : MIME_TYPES.html;

    // Add cache headers for better performance
    const maxAge = 31536000; // 1 year in seconds
    const isHtml = mimeType === MIME_TYPES.html;

    // Generate ETag based on content hash for better caching
    const dataLength = Buffer.isBuffer(cachedData)
        ? cachedData.length
        : Buffer.byteLength(cachedData, 'utf8');
    const etag = `"${dataLength}-${url.replace(/[^a-zA-Z0-9]/g, '')}"`;

    // Check if client has cached version
    const ifNoneMatch = req.getHeader('if-none-match');
    if (!isHtml && ifNoneMatch === etag) {
        // Cache hit - file not modified
        logger.info(`Cache hit for ${url} - returning 304`);
        res.cork(() => {
            res.writeStatus('304'); // Not Modified
            res.writeHeader(
                'Cache-Control',
                `public, max-age=${maxAge}, immutable`,
            );
            res.writeHeader('ETag', etag);
            res.end();
        });
        return;
    }

    res.cork(() => {
        res.writeStatus('200');

        // Set appropriate headers
        res.writeHeader('Content-Type', mimeType);
        res.writeHeader('Content-Length', dataLength.toString());

        // Set CSP header for HTML files
        if (isHtml) {
            setCspHeader(res);
            // For HTML files, use shorter cache time
            res.writeHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        } else {
            // For static assets, use longer cache time
            res.writeHeader(
                'Cache-Control',
                `public, max-age=${maxAge}, immutable`,
            );
            res.writeHeader('ETag', etag);
        }

        // Add security headers
        res.writeHeader('X-Content-Type-Options', 'nosniff');

        // Note: Compression not implemented yet
        // When adding compression support, add: res.writeHeader('Vary', 'Accept-Encoding');

        res.end(cachedData);
    });
};

const staticHandler = (res: HttpResponse, req: HttpRequest) => {
    let data: string | Buffer | null = null;
    let statusCode = '404';
    let mimeType = '';
    const url = req.getUrl();
    // const ext =
    //     url.indexOf('.') !== -1
    //         ? path.extname(url).substring(1).toLowerCase()
    //         : '';
    // // logger.info(`Static handler request: ${url}, ext: ${ext}`);
    // if (ext) {
    //     mimeType = MIME_TYPES[ext] || MIME_TYPES.html;
    //     data = cache.get(url);
    //     statusCode = '200';
    //     if (!data) {
    //         statusCode = '404';
    //         data = cache.get('/404.html');
    //         logger.warn(`File not found in cache: ${url}`);
    //     } else {
    //         // logger.info(`Serving file from cache: ${url}`);
    //     }
    // } else {
    //     data = cache.get('/index.html');
    //     statusCode = data ? '200' : '404';
    //     mimeType = MIME_TYPES.html;
    // }

    if(url.indexOf('.') === -1){
        data = cache.get('/index.html');
        statusCode = data ? '200' : '404';
        mimeType = MIME_TYPES.html;
    }

    res.cork(() => {
        res.writeStatus(statusCode);
        if (mimeType === MIME_TYPES.html) setCspHeader(res);
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
    staticCacheHandler,
};
