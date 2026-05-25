import { z } from 'zod';

// Keepit uses a custom GUID format: 6-6-6 characters (e.g., 0m34mt-wny3i2-o5fjvo)
// This schema is used for account/customer GUIDs across PMC tools
export const KeepetGuidSchema = z.string()
    .min(1, 'GUID cannot be empty')
    .regex(
        /^[0-9a-z]{6}-[0-9a-z]{6}-[0-9a-z]{6}$/i,
        'Invalid Keepit GUID format (expected: xxxxxx-xxxxxx-xxxxxx)'
    );
