import process from 'node:process';
import path from 'node:path';
import { promises as fs } from 'node:fs';
// import logger from '#logger';
// import appConfig from '#config/app.js';



const STATIC_PATH = path.join(process.cwd(), './public');

const cache = new Map();

export const MIME_TYPES = {
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

// if (appConfig.serveStatic) {
//     logger.info('cache Directory ' + STATIC_PATH);
//     cacheDirectory(STATIC_PATH).then(() => {
//         logger.info('Success cache Directory ' + STATIC_PATH);
//     });
// }
//
// if (appConfig.serveStatic) {
//     const url = req.getUrl();
//
//     const ext =
//         url === '/' || url === ''
//             ? 'html'
//             : path.extname(url).substring(1).toLowerCase();
//     if (ext) {
//         const mimeType = MIME_TYPES[ext] || MIME_TYPES.html;
//         data =
//             (url === '/' || url === '') &&
//             cache.has('/index.html')
//                 ? cache.get('/index.html')
//                 : cache.get(url);
//         // data = cache.get(url);
//         statusCode = '200';
//         if (!data) {
//             statusCode = '404';
//             data = cache.get('/404.html');
//         }
//         res.writeHeader('Content-Type', mimeType);
//     }
// }
export { cacheFile, cacheDirectory };
