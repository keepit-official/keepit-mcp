import { z } from 'zod';

export const AuditLogRequestSchema = z.object({
    duration: z.iso.duration(),
    limit: z.number().int().positive().optional().describe('Maximum number of records to return (default: 50). Server enforces this limit in the API request.'),
    offset: z.number().int().min(0).optional().describe('Offset for fetching the next page of results.')
});
