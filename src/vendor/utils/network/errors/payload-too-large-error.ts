export class PayloadTooLargeError extends Error {
    readonly name = 'PayloadTooLargeError';

    constructor(
        public readonly limit: number,
        public readonly contentType: string,
    ) {
        super(`Payload exceeds limit ${String(limit)} bytes for ${contentType}`);
    }
}
