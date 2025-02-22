import process from 'node:process';
import chokidar from 'chokidar';
import logger from '#logger';

// test version
export default (restart: Function) => {

    const watcher = chokidar.watch( process.cwd(),
        {
        ignored: [
            `${process.cwd()}/node_modules`,
            `${process.cwd()}/README.md`,
            `${process.cwd()}/dev.js`,
            `${process.cwd()}/.gitignore`,
            `${process.cwd()}/.git`,
            `${process.cwd()}/vendor/start/watcher.js`,
        ],
        ///[\/\\]\./,
        usePolling: false,
        persistent: true,
        // @ts-ignore
        stabilityThreshold: 2000,
        awaitWriteFinish: true,
    });
    logger.info('watcher start');
    // eslint-disable-next-line no-undef
    setTimeout(() => {
        watcher.on('add', (path) => {
            logger.info(`File ${path} has been added`);
            restart();
        });
        watcher.on('change', (path) => {
            logger.info(`File ${path} has been change`);
            restart();
        });
        watcher.on('unlink', (path) => {
            logger.info(`File ${path} has been removed`);
            restart();
        });
    }, 1000);
};
