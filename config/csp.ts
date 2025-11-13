import { env } from 'node:process';
export default Object.freeze({
    enabled: true,
    reportOnly: false,
    // Provide a full CSP policy string, or remove `policy` and set `directives` map instead
//     policy:
//         "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: https:",
    // Alternative shape (commented) if you prefer directives object
    directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", 'data:', 'blob:'],
        "font-src": ["'self'", 'data:'],
        "connect-src": env.APP_ENV === 'production' || env.APP_ENV === 'prod' ? ["'self'", 'wss:', 'https:', 'blob:'] : ["'self'", 'ws:', 'wss:', 'https:', 'http:', 'blob:'],
    },
});