import process from 'node:process';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import logger from '#logger';
import appConfig from '#config/app.js';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';



const STATIC_PATH = path.join(process.cwd(), './public');

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
    const data = await fs.readFile(filePath, 'utf8');
    const key = filePath.substring(STATIC_PATH.length);
    cache.set(key, data);
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
}
const staticRoutes = ['/','/chat','/login','/register','/chat','/account','/news','/news/create','/news/edit', '/news/:id','/manifesto'];

const staticIndexHandler = (res: HttpResponse, req: HttpRequest) => {
    let data = cache.get('/index.html');
    let statusCode = data? '200': '404';
    let mimeType = MIME_TYPES.html;
    res.cork(() => {
        res.writeStatus(statusCode);
        res.writeHeader('Content-Type', mimeType);
        res.end(data || '');
    });
}
const staticHandler = (res: HttpResponse, req: HttpRequest) => {
    let data: string | null = null;
    let statusCode = '404';
    let mimeType = '';
    const url = req.getUrl();
    const ext = path.extname(url).substring(1).toLowerCase();
    if (ext) {
        mimeType = MIME_TYPES[ext] || MIME_TYPES.html;
        data =  cache.get(url);
        statusCode = '200';
        if (!data) {
            statusCode = '404';
            data = cache.get('/404.html');
        }
    }

    res.cork(() => {
        res.writeStatus(statusCode);
        res.writeHeader('Content-Type', mimeType);
        res.end(data || '');
    });

}



export { cacheFile, cacheDirectory, startStaticServer, staticHandler, staticIndexHandler };
