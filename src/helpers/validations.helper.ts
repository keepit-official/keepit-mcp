import { ENVIRONMENTS } from './environments.helper.js';
import type { IAuthConfig } from './auth-config.helper';

const validRegions = Object.keys(ENVIRONMENTS).filter(k => k !== 'unknown');

/**
 * Validates that the resolved auth configuration is usable for API requests.
 */
export function validateEnvironment(authConfig: IAuthConfig): void {
    const authToken = authConfig.authToken;
    const keepitEnv = authConfig.keepitEnv;

    if (!authToken) {
        throw new Error('Authentication is not configured. Check KEEPIT_USER and KEEPIT_PASS.');
    }

    if (!keepitEnv) {
        throw new Error('KEEPIT_ENV environment variable is required.');
    }

    if (!validRegions.includes(keepitEnv)) {
        throw new Error(`Invalid KEEPIT_ENV value "${keepitEnv}". Must be one of: ${validRegions.join(', ')}.`);
    }

    // Validate authentication token format (Base64 characters only, minimum 8 chars)
    const tokenPattern = /^[A-Za-z0-9+/=]{8,}$/;
    if (!tokenPattern.test(authToken)) {
        throw new Error('Invalid authentication token format');
    }
}

export function getStringValue(value: unknown): string {
    return value ? String(value) : '';
}
