import { z } from 'zod';

// Keepit uses a different GUID format: 6-6-6 characters (e.g., 0m34mt-wny3i2-o5fjvo)
// This is different from standard UUID format: 8-4-4-4-12 characters
export const ConnectorGuidSchema = z.string()
    .min(1, 'Connector GUID cannot be empty')
    .regex(
        /^[0-9a-z]{6}-[0-9a-z]{6}-[0-9a-z]{6}$/i,
        'Invalid Keepit connector GUID format (expected: xxxxxx-xxxxxx-xxxxxx)'
    );
