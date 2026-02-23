import { z } from 'zod';
import { ISO8601DurationSchema } from '../validations/iso8601.validation-schemas.js';

export const AuditLogRequestSchema = z.object({
    duration: ISO8601DurationSchema,
    pagination: z.object({
        limit: z.number().int().positive().optional().describe('Maximum number of records to return (default: 50). Server enforces this limit in the API request.'),
        offset: z.number().int().min(0).optional().describe('Offset for fetching the next page of results.')
    }).optional()
});
