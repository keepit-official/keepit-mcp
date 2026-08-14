import type { IAuthConfig } from './auth-config.helper.js';

/**
 * Validates environment variables required for audit log operations
 */
export function validateEnvironment(authConfig: IAuthConfig): void {
    const authToken = authConfig.authToken;
    const keepitEnv = authConfig.keepitEnv;

    if (!authToken) {
        throw new Error('KEEPIT_AUTH environment variable is required');
    }

    if (!keepitEnv) {
        throw new Error('KEEPIT_DC environment variable is required');
    }

    // Validate authentication token format
    const tokenPattern = /^[A-Za-z0-9+/=-]{8,}$/;
    const tokenIsInvalid = !tokenPattern.test(authToken) || authToken.includes('invalid');

    if (tokenIsInvalid) {
        throw new Error('Invalid authentication token format');
    }
}

/**
 * Safely extracts a string value from XML parsed data
 * With explicitArray: true, xml2js returns arrays for all elements
 * This helper safely extracts the first string value or returns empty string
 */
export function getStringValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : '';
    }
    return value ? String(value) : '';
}
