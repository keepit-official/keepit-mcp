import { z } from 'zod';
import { ISO8601DurationSchema } from '../validations/iso8601.validation-schemas.js';
import { AccountIdSchema } from '../entities/account.schemas.js';

// Audit log fetch budget — anti-DDOS safety valves.
//
// AUDIT_LOG_UPSTREAM_PAGE_SIZE: records requested per individual API call to Keepit.
//   Kept small to avoid long-latency responses and to stay within Keepit's per-request limits.
//
// AUDIT_LOG_FETCH_CAP: ceiling on the total number of raw records fetched from Keepit
//   per tool invocation. Prevents runaway pagination from hammering the API under a broad
//   query. The default is 500. For security audits that require more history, raise the
//   ceiling by setting the KEEPIT_AUDIT_FETCH_CAP environment variable (hard max: 2000).
//
// AUDIT_LOG_MAX_PAGE_SIZE / AUDIT_LOG_DEFAULT_PAGE_SIZE: MCP tool-level output limits —
//   how many records the tool returns to the caller after filtering. These are intentionally
//   separate from the fetch cap: a broad filter with a small output page still only fetches
//   up to the fetch cap from Keepit, protecting the API regardless of caller preferences.
export const AUDIT_LOG_MAX_PAGE_SIZE = 500;
export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 500;
export const AUDIT_LOG_UPSTREAM_PAGE_SIZE = 200;

const AUDIT_LOG_FETCH_CAP_DEFAULT = 500;
const AUDIT_LOG_FETCH_CAP_CEILING = 2000;

const resolveAuditFetchCap = (): number => {
    const raw = process.env.KEEPIT_AUDIT_FETCH_CAP;
    if (!raw) return AUDIT_LOG_FETCH_CAP_DEFAULT;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return AUDIT_LOG_FETCH_CAP_DEFAULT;
    return Math.min(parsed, AUDIT_LOG_FETCH_CAP_CEILING);
};

export const AUDIT_LOG_FETCH_CAP = resolveAuditFetchCap();

const AccountScopeSchema = z.enum(['account', 'children', 'leaf', 'managed', 'all']);

export const AuditLogRequestSchema = z.object({
    duration: ISO8601DurationSchema.default('P7D'),
    account_id: AccountIdSchema.optional(),
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
