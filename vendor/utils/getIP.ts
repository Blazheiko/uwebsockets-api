import { HttpRequest, HttpResponse } from 'uWebSockets.js';

// const decoder = new TextDecoder("utf-8");
// const arrayBufferToIP = (buffer: ArrayBuffer) => {
//     let str = decoder.decode(buffer);

//     // Убираем всё после нулевого байта (ASCIIZ-строка)
//     const nullIndex = str.indexOf("\0");
//     if (nullIndex !== -1) str = str.slice(0, nullIndex);

//     return str;
// }
const ab2str = (buffer: ArrayBuffer, encoding: BufferEncoding | undefined = 'utf8') => Buffer.from(buffer).toString(encoding);

export default (req: HttpRequest, res: HttpResponse) => {
       const ip = req.getHeader('x-forwarded-for') || req.getHeader('x-real-ip');
    
    return ip ? ip.trim(): ab2str(res.getRemoteAddressAsText());
};