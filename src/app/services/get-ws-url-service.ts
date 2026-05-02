import configApp from '#config/app.js';

export function getWsUrl(): string {
    const protocol =
        configApp.env === 'production' || configApp.env === 'prod' ? 'wss' : 'ws';
    return `${protocol}://${configApp.domain}/${configApp.pathPrefix}/websocket`;
}
