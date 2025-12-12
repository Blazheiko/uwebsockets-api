/**
 * Validates HTTP cookie names and values
 *
 * Cookie validation according to RFC 6265:
 * - Cookie names should be valid tokens (letters, numbers, hyphens, underscores)
 * - Cookie values can contain most characters but are typically URL-encoded
 * - Practical limits are enforced to prevent abuse and ensure compatibility
 */

import appConfig from '#config/app.js';

/**
 * Valid cookie name characters: letters, numbers, hyphens, underscores
 * RFC 6265: cookie-name = token (token = 1*<any CHAR except CTLs or separators>)
 * In practice, cookie names are typically alphanumeric with hyphens and underscores
 */
const COOKIE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Valid cookie value characters: letters, numbers, safe symbols, and percent-encoding
 * RFC 6265 excludes: control characters, whitespace, quotes, commas, semicolons, backslashes
 * This pattern allows only safe characters to prevent injection attacks:
 * - Alphanumeric characters (a-z, A-Z, 0-9)
 * - Safe symbols: hyphen (-), underscore (_), dot (.), tilde (~), asterisk (*), plus (+), slash (/), equals (=)
 * - Percent-encoded sequences (%XX where XX are uppercase hex digits)
 *
 * Excluded dangerous characters for injection prevention:
 * - Semicolon (;) - cookie separator, can be used for cookie injection
 * - Comma (,) - can be used as separator in some contexts
 * - Double quote (") - can be used for escaping and injection
 * - Backslash (\) - escape character, can be used for injection
 * - Control characters (0x00-0x1F, 0x7F) and whitespace - not allowed in cookie values
 *
 * Note: Values are validated before URL decoding, so percent-encoding is allowed
 */
const COOKIE_VALUE_PATTERN = /^[a-zA-Z0-9\-_.~*+/=%]+$/;

/**
 * Pattern to validate percent-encoded sequences: % must be followed by exactly two hex digits
 * Compiled once for better performance
 */
const PERCENT_ENCODING_PATTERN = /^(?:%[0-9A-Fa-f]{2}|[^%])*$/;

/**
 * Validates that percent-encoded sequences are properly formatted
 * Checks that % is always followed by exactly two hex digits
 * Optimized: uses pre-compiled regex and early exit for strings without %
 */
function isValidPercentEncoding(value: string): boolean {
    // Early exit: if no %, validation passes
    if (!value.includes('%')) {
        return true;
    }
    // Match: any non-% characters OR % followed by exactly two hex digits
    return PERCENT_ENCODING_PATTERN.test(value);
}

/**
 * Validates HTTP cookie name and value
 * @param key - Cookie name to validate
 * @param value - Cookie value to validate
 * @returns true if both cookie name and value are valid, false otherwise
 */
export function validateCookie(key: string, value: string): boolean {
    // Check if value exists and is not empty
    if (!value || typeof value !== 'string') {
        return false;
    }

    // Check cookie value length (reasonable limit to prevent abuse)
    if (value.length >= appConfig.reasonableCookieLimit) {
        return false;
    }

    // Check cookie value pattern (safe characters only, prevents injection)
    if (!COOKIE_VALUE_PATTERN.test(value)) {
        return false;
    }

    // Validate percent-encoding format if present
    if (value.includes('%') && !isValidPercentEncoding(value)) {
        return false;
    }

    // Check cookie name pattern (only alphanumeric, hyphens, underscores)
    if (!COOKIE_NAME_PATTERN.test(key)) {
        return false;
    }

    // Check cookie name length (reasonable limit, typically 255 chars max)
    if (key.length >= appConfig.reasonableCookieKeyLimit) {
        return false;
    }

    return true;
}
