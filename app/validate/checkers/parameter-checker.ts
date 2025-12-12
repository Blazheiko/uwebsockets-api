/**
 * Validates URL path parameters
 */

const MAX_PARAMETER_LENGTH = 256;

/**
 * Valid parameter characters: letters, numbers, hyphens, underscores, dots, slashes
 * This pattern allows common URL-safe characters for path parameters
 */
const PARAMETER_PATTERN = /^[a-zA-Z0-9\-_./]*$/;

/**
 * Validates URL path parameter value
 * @param value - Parameter value to validate
 * @returns true if parameter value is valid, false otherwise
 */
export function validateParameter(value: string): boolean {
    if (value === null || value === undefined) {
        return true; // Empty parameters are allowed
    }

    const stringValue = String(value);

    if (stringValue.length > MAX_PARAMETER_LENGTH) {
        return false;
    }

    if (stringValue.length > 0 && !PARAMETER_PATTERN.test(stringValue)) {
        return false;
    }

    return true;
}
