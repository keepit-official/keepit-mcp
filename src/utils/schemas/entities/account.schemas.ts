import { z } from 'zod';

// Account IDs may only contain alphanumeric characters, hyphens, and underscores.
// Slashes and dot-dot sequences are explicitly rejected to prevent path traversal in URLs.
export const AccountIdSchema = z.string()
    .trim()
    .min(1, 'Account ID cannot be empty')
    .max(100, 'Account ID is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Account ID contains invalid characters');
