import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';

const GET_KEEPIT_AUDIT_LOG_HISTORY = {
    name: 'get_audit_log_history',
    description: 'Get raw audit log events for one account or an account scope. Prefer scope "account" for a single tenant/client. Responses return at most 500 records per request window. Offset continuation is supported for single-account queries only.',
    inputSchema: {
        type: 'object',
        properties: {
            duration: {
                type: 'string',
                description: 'Duration to look back, for example PT6H, P7D, or P1M.',
                default: 'P7D'
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of records to return from the current fetched window. Defaults to 500 and cannot exceed 500.',
                default: 500
            },
            offset: {
                type: 'integer',
                description: 'Numeric continuation offset for the next window. Reuse only with the same query parameters. Supported for single-account queries only.',
                default: 0
            },
            account_id: {
                type: 'string',
                description: 'Optional account ID.'
            },
            scope: {
                type: 'string',
                enum: ['account', 'children', 'leaf', 'managed', 'all'],
                description: 'Scope for audit lookups. Use "account" for one specific account, "children" for direct child accounts, "leaf" for descendant leaf accounts, "managed" for MSP-managed leaf accounts, or "all" for the root account plus direct child accounts.'
            },
            message_contains: {
                type: 'string',
                description: 'Optional case-insensitive filter applied to the audit message.'
            },
            token_contains: {
                type: 'string',
                description: 'Optional case-insensitive filter applied to the token/actor field.'
            },
            account_name_contains: {
                type: 'string',
                description: 'Optional case-insensitive filter applied to resolved account names.'
            },
            allowed: {
                type: 'boolean',
                description: 'Optional filter for whether the action was allowed.'
            },
            acl: {
                type: 'string',
                description: 'Optional exact ACL filter.'
            },
            include_actor_resolution: {
                type: 'boolean',
                description: 'When false, skip actor username enrichment.',
                default: true
            },
            sort_order: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort audit events by time.',
                default: 'desc'
            }
        },
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            auditLogs: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        account_id: {
                            type: 'string',
                            description: 'Resolved account identifier associated with the audit event'
                        },
                        account_name: {
                            type: ['string', 'null'],
                            description: 'Resolved account name when available'
                        },
                        acl: {
                            type: ['string', 'null'],
                            description: 'ACL identifying an endpoint'
                        },
                        token: {
                            type: ['string', 'null'],
                            description: 'Token (aname) which performed an audited action'
                        },
                        action: {
                            type: ['string', 'null'],
                            description: 'Specific action that was performed'
                        },
                        area: {
                            type: ['string', 'null'],
                            description: 'Area where the action occurred'
                        },
                        allowed: {
                            type: 'boolean',
                            description: 'Indicates where an action was allowed by the system'
                        },
                        company: {
                            type: ['string', 'null'],
                            description: 'Companyname of the account that triggered this action'
                        },
                        device: {
                            type: ['string', 'null'],
                            description: 'Device where the audit event occured'
                        },
                        message: {
                            type: 'string',
                            description: 'A message related to the audit event'
                        },
                        succeeded: {
                            type: 'boolean',
                            description: 'Whether the action completed successfully'
                        },
                        'client-ip': {
                            type: ['string', 'null'],
                            description: 'IP address of the client that performed the action'
                        },
                        time: {
                            type: 'string',
                            format: 'date-time',
                            description: 'ISO 8601 timestamp when the audit event occurred'
                        },
                        method: {
                            type: ['string', 'null'],
                            description: 'Method applied in the audit event'
                        }
                    },
                    required: ['account_id', 'message', 'time']
                },
                description: 'List of audit log records for the specified time period'
            },
            pagination: {
                type: 'object',
                properties: {
                    hasMorePages: {
                        type: 'boolean',
                        description: 'Indicates that more matching audit data can be retrieved by repeating the same single-account query with nextOffset'
                    },
                    nextOffset: {
                        type: 'integer',
                        description: 'Numeric offset to reuse in the next request for a single-account query.'
                    },
                    totalInResponse: {
                        type: 'integer',
                        description: 'Total number of records returned in the current response'
                    },
                    totalAvailable: {
                        type: 'integer',
                        description: 'Total filtered records available in the current fetched window only. If the 500-record cap was hit, this is not the global total.'
                    }
                }
            }
        },
        required: ['auditLogs', 'pagination']
    }
} as const satisfies Tool;

const GET_KEEPIT_AUDIT_LOG_SUMMARY = {
    name: 'get_audit_log_summary',
    description: 'Get an aggregated audit summary for one account or an account scope. Use this when you want trends, counts, top actors, or top messages rather than raw events. For single-tenant questions, prefer scope "account".',
    inputSchema: {
        type: 'object',
        properties: {
            duration: {
                type: 'string',
                description: 'Duration to look back, for example PT6H, P7D, or P1M.',
                default: 'P30D'
            },
            top_n: {
                type: 'integer',
                description: 'Maximum number of rows to return in each ranked summary section.',
                default: 10
            },
            account_id: {
                type: 'string',
                description: 'Optional account ID.'
            },
            scope: {
                type: 'string',
                enum: ['account', 'children', 'leaf', 'managed', 'all'],
                description: 'Scope for audit lookups. Use "account" for one specific account, "children" for direct child accounts, "leaf" for descendant leaf accounts, "managed" for MSP-managed leaf accounts, or "all" for the root account plus direct child accounts.'
            },
            message_contains: {
                type: 'string',
                description: 'Optional case-insensitive filter applied before aggregation.'
            },
            token_contains: {
                type: 'string',
                description: 'Optional case-insensitive token or actor filter applied before aggregation.'
            },
            account_name_contains: {
                type: 'string',
                description: 'Optional case-insensitive resolved account-name filter applied before aggregation.'
            },
            allowed: {
                type: 'boolean',
                description: 'Optional filter for allowed or denied events before aggregation.'
            },
            acl: {
                type: 'string',
                description: 'Optional exact ACL filter applied before aggregation.'
            },
            include_actor_resolution: {
                type: 'boolean',
                description: 'When false, skip actor username enrichment before summarizing.',
                default: true
            },
            sort_order: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order applied to the underlying event window before summary processing.',
                default: 'desc'
            }
        },
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            summary: {
                type: 'object',
                properties: {
                    total_events: { type: 'integer' },
                    unique_accounts: { type: 'integer' },
                    unique_ips: { type: 'integer' },
                    allowed_count: { type: 'integer' },
                    denied_count: { type: 'integer' },
                    duration: { type: 'string' },
                    window_start: { type: 'string', format: 'date-time' },
                    window_end: { type: 'string', format: 'date-time' },
                    summary_capped: { type: 'boolean' }
                },
                required: ['total_events', 'unique_accounts', 'unique_ips', 'allowed_count', 'denied_count', 'duration', 'window_start', 'window_end', 'summary_capped']
            },
            accounts: { type: 'array', items: { type: 'object' } },
            top_messages: { type: 'array', items: { type: 'object' } },
            top_actors: { type: 'array', items: { type: 'object' } },
            top_ips: { type: 'array', items: { type: 'object' } }
        },
        required: ['summary', 'accounts', 'top_messages', 'top_actors', 'top_ips']
    }
} as const satisfies Tool;

export const AUDIT_LOG_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_audit_log_history: [{
        name: 'User',
        options: ['get']
    }, {
        name: 'AuditFilter',
        options: ['put']
    }],
    get_audit_log_summary: [{
        name: 'User',
        options: ['get']
    }, {
        name: 'AuditFilter',
        options: ['put']
    }]
};

export const AUDIT_LOG_TOOLS_DEFINITIONS = [
    GET_KEEPIT_AUDIT_LOG_HISTORY,
    GET_KEEPIT_AUDIT_LOG_SUMMARY
] as const;
