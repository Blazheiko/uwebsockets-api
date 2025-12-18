/**
 * Validates URL path parameters
 */

/**
 * Error class for parameter validation failures
 */
export class ParameterValidationError extends Error {
    public readonly code: string = 'E_PARAMETER_VALIDATION_ERROR';
    public readonly parameterName: string;
    public readonly parameterValue: string;

    constructor(
        parameterName: string,
        parameterValue: string,
        message?: string,
    ) {
        super(
            message ||
                `Invalid parameter: ${parameterName} with value: ${parameterValue}`,
        );
        this.name = 'ParameterValidationError';
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
    }
}

const MAX_PARAMETER_LENGTH = 256;

/**
 * Valid parameter characters: letters, numbers, hyphens, underscores, dots, slashes
 * This pattern allows common URL-safe characters for path parameters
 */
const PARAMETER_PATTERN = /^[a-zA-Z0-9\-_./]*$/;

/**
 * Validates URL path parameter value
 * @param value - Parameter value to validate
 * @param parameterName - Name of the parameter being validated
 * @throws {ParameterValidationError} When parameter validation fails
 */
export function validateParameter(value: string, parameterName?: string): void {
    if (value === null || value === undefined) {
        return; // Empty parameters are allowed
    }

    const stringValue = String(value);
    const paramName = parameterName || 'unknown';

    if (stringValue.length > MAX_PARAMETER_LENGTH) {
        throw new ParameterValidationError(
            paramName,
            stringValue,
            `Parameter '${paramName}' exceeds maximum length of ${MAX_PARAMETER_LENGTH} characters`,
        );
    }

    if (stringValue.length > 0 && !PARAMETER_PATTERN.test(stringValue)) {
        throw new ParameterValidationError(
            paramName,
            stringValue,
            `Parameter '${paramName}' contains invalid characters. Only letters, numbers, hyphens, underscores, dots, and slashes are allowed`,
        );
    }
}
