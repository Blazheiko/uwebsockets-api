import configApp from '#config/app.js';

export default (token: string) =>{
    return `${configApp.env === 'production' || configApp.env === 'prod' ? 'wss' : 'ws'}://${configApp.domain}/${configApp.pathPrefix}/websocket/${token}`;
}