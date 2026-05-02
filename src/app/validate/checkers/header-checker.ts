/**
 * Validates HTTP header names and values according to RFC 7230
 * using regex and length constraints.
 *
 * Note: RFC 7230 does not specify maximum lengths, but uWebSockets.js
 * has a default limit of 4 KB for the total size of all headers.
 * These limits are set to reasonable values that work well with uWebSockets.js
 */

const HEADER_NAME_MIN_LENGTH = 1;
const HEADER_NAME_MAX_LENGTH = 256;
const HEADER_VALUE_MAX_LENGTH = 3072;
const HEADER_NAME_PATTERN = /^[a-zA-Z0-9\-_]+$/;
// eslint-disable-next-line no-control-regex
const HEADER_VALUE_PATTERN = /^[\x09\x20-\x7E]*$/;

/**
 * Validates HTTP header name
 * @param name - Header name to validate
 * @returns true if header name is valid, false otherwise
 */
export function validateHeaderName(name: string): boolean {
  return (
    name.length >= HEADER_NAME_MIN_LENGTH &&
    name.length <= HEADER_NAME_MAX_LENGTH &&
    HEADER_NAME_PATTERN.test(name)
  );
}

/**
 * Validates HTTP header value
 * @param value - Header value to validate
 * @returns true if header value is valid, false otherwise
 */
export function validateHeaderValue(value: string): boolean {
  return (
    value.length <= HEADER_VALUE_MAX_LENGTH && HEADER_VALUE_PATTERN.test(value)
  );
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
