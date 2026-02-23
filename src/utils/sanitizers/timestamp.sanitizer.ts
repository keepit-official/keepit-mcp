import { ISO8601TimestampSchema } from '../schemas/validations/iso8601.validation-schemas.js';

/**
 * Validates and sanitizes ISO8601 timestamp to prevent injection attacks
 */
export function validateAndSanitizeTimestamp (timestamp: string): string {
    const validationResult = ISO8601TimestampSchema.safeParse(timestamp);
    if (!validationResult.success) {
        throw new Error('Invalid ISO8601 timestamp format');
    }
  
    // Additional time range validation
    const date = new Date(timestamp);
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
  
    if (date > oneYearFromNow) {
        throw new Error('Timestamp cannot be more than 1 year in the future');
    }
  
    if (date < fiveYearsAgo) {
        throw new Error('Timestamp cannot be more than 5 years in the past');
    }
  
    return validationResult.data;
}
