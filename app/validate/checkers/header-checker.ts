/**
 * Validates HTTP header names and values according to RFC 7230
 *
 * Note: RFC 7230 does not specify maximum lengths, but uWebSockets.js
 * has a default limit of 4 KB for the total size of all headers.
 * These limits are set to reasonable values that work well with uWebSockets.js
 */

// Reasonable limit for header name (most header names are 10-50 characters)
const MAX_HEADER_NAME_LENGTH = 256;

// Reasonable limit for header value (uWebSockets.js default total header size is 4 KB)
// This allows for multiple headers while staying within the total limit
const MAX_HEADER_VALUE_LENGTH = 3072;

/**
 * Valid header name characters: letters, numbers, hyphens, underscores
 * RFC 7230: header-field = field-name ":" OWS field-value OWS
 * field-name = token (token = 1*tchar, tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA)
 */
const HEADER_NAME_PATTERN = /^[a-zA-Z0-9\-_]+$/;

/**
 * Valid header value characters: VCHAR (33-126), SP (32), HTAB (9)
 * RFC 7230 technically allows obs-text (128-255) but discourages it for new headers.
 * This implementation uses a stricter validation (ASCII only) for security and compatibility.
 * Pattern matches: HTAB (0x09) + SP (0x20) + VCHAR (0x21-0x7E) excluding '%' (0x25)
 *
 * Note: Percent-encoding is not standard practice in HTTP header values per RFC 7230.
 * Prohibiting '%' simplifies validation and prevents potential security issues with
 * malformed percent-encoded sequences (e.g., %%, %2, %25%).
 */
const HEADER_VALUE_PATTERN = /^[\x09\x20-\x24\x26-\x7E]*$/;

/**
 * Validates HTTP header name
 * @param name - Header name to validate
 * @returns true if header name is valid, false otherwise
 */
export function validateHeaderName(name: string): boolean {
    if (!name || typeof name !== 'string') {
        return false;
    }

    if (name.length > MAX_HEADER_NAME_LENGTH) {
        return false;
    }

    if (!HEADER_NAME_PATTERN.test(name)) {
        return false;
    }

    return true;
}

/**
 * Validates HTTP header value
 * @param value - Header value to validate
 * @returns true if header value is valid, false otherwise
 */
export function validateHeaderValue(value: string): boolean {
    if (value === null || value === undefined) {
        return false;
    }

    const stringValue = String(value);

    if (stringValue.length > MAX_HEADER_VALUE_LENGTH) {
        return false;
    }

    if (!HEADER_VALUE_PATTERN.test(stringValue)) {
        return false;
    }

    return true;
}

/**
 * Validates both header name and value
 * @param name - Header name to validate
 * @param value - Header value to validate
 * @returns true if both header name and value are valid, false otherwise
 */
export function validateHeader(name: string, value: string): boolean {
    return validateHeaderName(name) && validateHeaderValue(value);
}
