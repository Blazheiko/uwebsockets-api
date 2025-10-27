import logger from '#logger';

// Branded types for type safety
declare const __userIdBrand: unique symbol;
export type UserId = string & { readonly [__userIdBrand]: true };

declare const __rawUserIdBrand: unique symbol;
export type RawUserId = (string | bigint | number | undefined | null) & {
    readonly [__rawUserIdBrand]: true;
};

// More specific error types
export class UserIdValidationError extends Error {
    constructor(
        message: string,
        public readonly receivedValue: unknown,
        public readonly receivedType: string,
    ) {
        super(message);
        this.name = 'UserIdValidationError';
    }
}

export class UserIdFormatError extends UserIdValidationError {
    constructor(receivedValue: unknown) {
        super(
            'Invalid userId format: contains non-digit characters',
            receivedValue,
            typeof receivedValue,
        );
        this.name = 'UserIdFormatError';
    }
}

export class UserIdTypeError extends UserIdValidationError {
    constructor(receivedValue: unknown, receivedType: string) {
        super(
            `Invalid userId type: ${receivedType}`,
            receivedValue,
            receivedType,
        );
        this.name = 'UserIdTypeError';
    }
}

// Type guards
export function isValidUserIdString(value: string): value is UserId {
    const trimmed = value.trim();
    return trimmed !== '' && /^\d+$/.test(trimmed);
}

export function isValidUserIdNumber(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value);
}

export function isValidUserIdBigInt(value: bigint): boolean {
    return value >= 0n;
}

// Input validation constants
const MAX_SAFE_USER_ID = Number.MAX_SAFE_INTEGER;
const USER_ID_REGEX = /^\d+$/;

/**
 * Normalizes userId to string format for protection against type coercion attacks
 * Protects against: BigInt/String confusion, scientific notation, empty strings, injections
 *
 * @param userId - userId in any format (bigint, number, string, undefined, null)
 * @returns normalized userId as branded string or '0' for unauthorized users
 * @throws {UserIdFormatError} When string contains non-digit characters
 * @throws {UserIdTypeError} When userId type is not supported
 *
 * @example
 * ```typescript
 * const userId1 = normalizeUserId(123); // "123"
 * const userId2 = normalizeUserId("456"); // "456"
 * const userId3 = normalizeUserId(null); // "0"
 * const userId4 = normalizeUserId("abc"); // throws UserIdFormatError
 * ```
 */
export const normalizeUserId = (
    userId: string | bigint | number | undefined | null,
): UserId => {
    // Handle null/undefined cases - return unauthorized user ID
    if (userId === undefined || userId === null) {
        return '0' as UserId;
    }

    // Handle numeric types (number and bigint)
    if (typeof userId === 'number') {
        // Additional validation for numbers
        if (!isValidUserIdNumber(userId)) {
            const error = new UserIdTypeError(
                userId,
                'number (invalid range or not integer)',
            );
            logger.error(`Invalid userId number: ${userId}`, {
                userId,
                type: typeof userId,
            });
            throw error;
        }
        return userId.toString() as UserId;
    }

    if (typeof userId === 'bigint') {
        // Additional validation for bigint
        if (!isValidUserIdBigInt(userId)) {
            const error = new UserIdTypeError(
                userId,
                'bigint (negative value)',
            );
            logger.error(`Invalid userId bigint: ${userId}`, {
                userId,
                type: typeof userId,
            });
            throw error;
        }
        return userId.toString() as UserId;
    }

    // Handle string type
    if (typeof userId === 'string') {
        // Remove whitespace
        const trimmed = userId.trim();

        // Empty string = unauthorized user
        if (trimmed === '') {
            return '0' as UserId;
        }

        // Enhanced validation: digits only, protection against scientific notation and injections
        if (!USER_ID_REGEX.test(trimmed)) {
            const error = new UserIdFormatError(userId);
            logger.error(`Invalid userId format: ${userId}`, {
                userId,
                type: typeof userId,
                trimmed,
            });
            throw error;
        }

        // Additional check for extremely large numbers that could cause issues
        const numericValue = Number(trimmed);
        if (numericValue > MAX_SAFE_USER_ID) {
            logger.warn(`UserId exceeds MAX_SAFE_INTEGER: ${trimmed}`, {
                userId: trimmed,
                maxSafe: MAX_SAFE_USER_ID,
            });
        }

        return trimmed as UserId;
    }

    // Handle unsupported types
    const receivedType = typeof userId;
    const error = new UserIdTypeError(userId, receivedType);
    logger.error(`Unsupported userId type: ${receivedType}`, {
        userId,
        type: receivedType,
    });
    throw error;
};

/**
 * Creates a branded UserId from a validated string
 * Use this when you're certain the string is a valid user ID
 *
 * @param validUserId - A string that's already validated to be a valid user ID
 * @returns Branded UserId type
 */
export const createUserId = (validUserId: string): UserId => {
    return validUserId as UserId;
};

/**
 * Safely converts any value to UserId with comprehensive error handling
 * This is a wrapper around normalizeUserId that never throws
 *
 * @param userId - Any value that might be a user ID
 * @param fallbackId - Fallback ID to use if normalization fails (default: '0')
 * @returns Normalized UserId or fallback
 */
export const safeNormalizeUserId = (
    userId: unknown,
    fallbackId: UserId = '0' as UserId,
): UserId => {
    try {
        return normalizeUserId(
            userId as string | bigint | number | undefined | null,
        );
    } catch (error) {
        logger.warn('Failed to normalize userId, using fallback', {
            userId,
            fallbackId,
            error: error instanceof Error ? error.message : String(error),
        });
        return fallbackId;
    }
};
