import logger from "#logger";

/**
 * Normalizes userId to string format for protection against type coercion attacks
 * Protects against: BigInt/String confusion, scientific notation, empty strings, injections
 * @param userId - userId in any format (bigint, number, string)
 * @returns normalized userId as string or '0' for unauthorized users
 */
export const normalizeUserId = (
    userId: string | bigint | number | undefined | null,
): string => {
    if (userId === undefined || userId === null) return '0';

    if (typeof userId === 'bigint' || typeof userId === 'number') {
        return userId.toString();
    }

    if (typeof userId === 'string') {
        // Remove whitespace
        const trimmed = userId.trim();

        // Empty string = unauthorized user
        if (trimmed === '') return '0';

        // Validation: digits only, protection against scientific notation and injections
        if (!/^\d+$/.test(trimmed)) {
            logger.error(`Invalid userId format: type: ${typeof userId} userId: ${userId}`);
            throw new Error(
                `Invalid userId format: contains non-digit characters`,
            );
        }

        return trimmed;
    }

    logger.error(`Invalid userId type: ${typeof userId} userId: ${userId}`);
    throw new Error(`Invalid userId type: ${typeof userId}`);
};