import { ISO8601DurationSchema } from '../schemas/validations/iso8601.validation-schemas.js';

/**
 * Validates and sanitizes ISO8601 duration to prevent injection attacks
 */
export const validateAndSanitizeDuration = (duration: string): string => {
    const validationResult = ISO8601DurationSchema.safeParse(duration);
    if (!validationResult.success) {
        throw new Error(`Invalid ISO8601 duration format: ${validationResult.error.issues[0].message}`);
    }
    return validationResult.data.toUpperCase();
};
