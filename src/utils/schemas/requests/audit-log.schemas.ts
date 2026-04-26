import { z } from 'zod';
import { ISO8601DurationSchema } from '../validations/iso8601.validation-schemas.js';

export const AUDIT_LOG_MAX_PAGE_SIZE = 500;
export const AUDIT_LOG_FETCH_CAP = 500;
export const AUDIT_LOG_UPSTREAM_PAGE_SIZE = 200;
export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 500;

const AccountScopeSchema = z.enum(['account', 'children', 'leaf', 'managed', 'all']);

export const AuditLogRequestSchema = z.object({
    duration: ISO8601DurationSchema.default('P7D'),
    account_id: z.string().trim().min(1).optional(),
    scope: AccountScopeSchema.optional(),
    message_contains: z.string().trim().min(1).optional(),
    token_contains: z.string().trim().min(1).optional(),
    account_name_contains: z.string().trim().min(1).optional(),
    allowed: z.boolean().optional(),
    acl: z.string().trim().min(1).optional(),
    include_actor_resolution: z.boolean().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    pagination: z.object({
        limit: z.number().int().min(1).max(AUDIT_LOG_MAX_PAGE_SIZE).optional(),
        offset: z.number().int().min(0).optional()
    }).optional()
});

export const AuditLogSummaryRequestSchema = AuditLogRequestSchema.extend({
    duration: ISO8601DurationSchema.default('P30D'),
    top_n: z.number().int().min(1).max(25).optional()
});
