/**
 * Validates HTTP cookie names and values using regex and length limits.
 *
 * Cookie validation according to RFC 6265:
 * - Cookie names should be valid tokens (letters, numbers, hyphens, underscores)
 * - Cookie values can contain most characters but are typically URL-encoded
 * - Practical limits are enforced to prevent abuse and ensure compatibility
 */

import appConfig from "#config/app.js";

const COOKIE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const COOKIE_VALUE_PATTERN = /^[a-zA-Z0-9\-_.~*+/=%]+$/;

/**
 * Pattern to validate percent-encoded sequences: % must be followed by exactly two hex digits
 */
const PERCENT_ENCODING_PATTERN = /^(?:%[0-9A-Fa-f]{2}|[^%])*$/;

/**
 * Validates HTTP cookie name and value
 * @param key - Cookie name to validate
 * @param value - Cookie value to validate
 * @returns true if both cookie name and value are valid, false otherwise
 */
export function validateCookie(key: string, value: string): boolean {
  if (value === "" || typeof value !== "string") return false;

  if (
    value.length >= appConfig.reasonableCookieLimit ||
    !COOKIE_VALUE_PATTERN.test(value)
  ) {
    return false;
  }

  if (value.includes("%") && !PERCENT_ENCODING_PATTERN.test(value)) {
    return false;
  }

  if (
    key.length === 0 ||
    key.length >= appConfig.reasonableCookieKeyLimit ||
    !COOKIE_NAME_PATTERN.test(key)
  ) {
    return false;
  }

  return true;
}
