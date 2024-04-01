import process from 'node:process';
import chokidar from 'chokidar';
import logger from '#logger';

export default (restart) => {
    const watcher = chokidar.watch(process.cwd(), {
        ignored: [
            `${process.cwd()}/node_modules`,
            /[\/\\]\./,
            `${process.cwd()}/README.md`,
        ],
        usePolling: false,
        persistent: true,
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
