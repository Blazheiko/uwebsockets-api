/**
 * Error class for request validation failures (ArkType validation)
 */
export class ValidationError extends Error {
    public readonly code: string = "E_VALIDATION_ERROR";
    public readonly messages: string[];

    constructor(messages: string[], message?: string) {
        super(message ?? "Validation failure");
        this.name = "ValidationError";
        this.messages = messages;
    }
}
