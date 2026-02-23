import { ISO8601DurationSchema } from '../schemas/validations/iso8601.validation-schemas.js';

/**
 * Validates and sanitizes ISO8601 timespan to prevent injection attacks
 */
export function validateAndSanitizeTimespan (timespan: string): string {
    // Basic validation before using Zod
    if (!timespan || typeof timespan !== 'string' || timespan.length === 0) {
        throw new Error('Invalid ISO8601 timespan format: Timespan cannot be empty');
    }

    // Check for invalid characters that shouldn't be in a timespan
    if (/[^PTYMDHMS0-9.]/i.test(timespan)) {
        throw new Error('Invalid ISO8601 timespan format: Contains invalid characters');
    }

    // Validate with Zod schema
    const validationResult = ISO8601DurationSchema.safeParse(timespan);
    if (!validationResult.success) {
    // Provide consistent error messages that match test expectations
        const errorMessage = validationResult.error.errors[0].message;
        if (errorMessage.includes('Duration cannot exceed 365 days')) {
            throw new Error('Invalid ISO8601 timespan format: Timespan cannot exceed 365 days');
        }
        throw new Error(`Invalid ISO8601 timespan format: ${errorMessage}`);
    }

    return validationResult.data.toUpperCase();
}
