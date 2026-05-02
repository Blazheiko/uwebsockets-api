import type { BodyKind } from '../http-request-handlers.js';

export class UnsupportedMediaTypeError extends Error {
    readonly name = 'UnsupportedMediaTypeError';

    constructor(
        public readonly receivedContentType: string,
        public readonly allowedKinds: BodyKind[],
    ) {
        super(`Unsupported Content-Type "${receivedContentType}". Allowed: ${allowedKinds.join(', ')}`);
    }
}
