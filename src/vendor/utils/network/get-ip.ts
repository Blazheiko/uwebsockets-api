import type { HttpRequest, HttpResponse } from '#vendor/start/server.js';

const ab2str = (buffer: ArrayBuffer, encoding: BufferEncoding | undefined = 'utf8'): string => Buffer.from(buffer).toString(encoding);

export default (req: HttpRequest, res: HttpResponse): string  => {
    const xForwardedFor = req.getHeader('x-forwarded-for');
    if (xForwardedFor !== '') {
        return xForwardedFor.trim();
    }
    const xRealIp = req.getHeader('x-real-ip');
    if (xRealIp !== '') {
        return xRealIp.trim();
    }
    
    return ab2str(res.getRemoteAddressAsText());
};