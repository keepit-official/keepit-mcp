import type { IToolRequiredAcl } from '../../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const PMC_GET_AUDIT_LOG_HISTORY_TOOL: Tool = {
    name: 'pmc_get_audit_log_history',
    title: 'Get audit log history',
    description: `Get audit log records for a specified date range. If customer_guid is provided, returns records only for that subaccount. If omitted, returns records grouped by subaccount across all partner subaccounts.
        Start the response with the total count: "{logCount} audit log records found."
        **Subaccount mode** (customer_guid provided): present the logs as a table with exactly these columns in this order — do not skip any column: Time (time), Account (account), Area (area), Company (company), Message (message), Token (token), Client IP (client-ip), Allowed (allowed).
        **Partner mode** (no customer_guid): for each subaccount (account), start with "Account: {account}" then present its logs as a table with exactly these columns in this order — do not skip any column: Time (time), Account (account), Area (area), Company (company), Message (message), Token (token), Client IP (client-ip), Allowed (allowed).`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'GUID of the subaccount to query. If omitted, logs for all subaccounts are returned grouped by subaccount.'
            },
            timeRange: {
                type: 'object',
                description: 'Date range for the audit log query',
                properties: {
                    from: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Start of the range in ISO 8601 format (e.g. 2026-03-01T00:00:00.000Z)'
                    },
                    to: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End of the range in ISO 8601 format (e.g. 2026-03-09T23:59:59.999Z)'
                    }
                },
                required: ['from', 'to'],
                additionalProperties: false
            }
        },
        required: ['timeRange'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            account: {
                type: 'string',
                description: 'Subaccount GUID (present in subaccount-level mode)'
            },
            auditLogs: {
                type: 'array',
                description: 'Audit log records (present in subaccount-level mode)',
                items: {
                    type: 'object',
                    properties: {
                        account: { type: 'string', description: 'Account identifier associated with the audit event' },
                        time: { type: 'string', format: 'date-time', description: 'Event timestamp' },
                        acl: { type: 'string', description: 'ACL identifying the audited endpoint' },
                        area: { type: 'string', description: 'Area where the audited action occurred' },
                        message: { type: 'string', description: 'Event message' },
                        token: { type: 'string', description: 'Token or user that triggered the event' },
                        company: { type: 'string', description: 'Company associated with the event' },
                        device: { type: 'string', description: 'Device associated with the event, if present' },
                        allowed: { type: 'string', description: 'Whether the action was allowed' },
                        succeeded: { type: 'string', description: 'Whether the action completed successfully' },
                        'client-ip': { type: 'string', description: 'Client IP address associated with the event' },
                        method: { type: 'string', description: 'HTTP or audit method used for the event' },
                        metadata: {
                            type: 'array',
                            description: 'List of metadata parameters',
                            items: {
                                type: 'object',
                                properties: {
                                    parameter: {
                                        type: 'object',
                                        properties: {
                                            key: { type: 'string', description: 'Parameter name or identifier' },
                                            value: { type: 'string', description: 'Parameter value' }
                                        },
                                        required: ['key', 'value']
                                    }
                                },
                                required: ['parameter']
                            }
                        }
                    },
                    required: ['account', 'area', 'company', 'client-ip', 'allowed', 'message', 'time', 'token']
                }
            },
            subaccounts: {
                type: 'array',
                description: 'Audit log records grouped by subaccount (present in partner-level mode)',
                items: {
                    type: 'object',
                    properties: {
                        account: { type: 'string', description: 'Subaccount GUID' },
                        auditLogs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    account: { type: 'string', description: 'Account identifier associated with the audit event' },
                                    time: { type: 'string', format: 'date-time', description: 'Event timestamp' },
                                    acl: { type: 'string', description: 'ACL identifying the audited endpoint' },
                                    area: { type: 'string', description: 'Area where the audited action occurred' },
                                    message: { type: 'string', description: 'Event message' },
                                    token: { type: 'string', description: 'Token or user that triggered the event' },
                                    company: { type: 'string', description: 'Company associated with the event' },
                                    device: { type: 'string', description: 'Device associated with the event, if present' },
                                    allowed: { type: 'string', description: 'Whether the action was allowed' },
                                    succeeded: { type: 'string', description: 'Whether the action completed successfully' },
                                    'client-ip': { type: 'string', description: 'Client IP address associated with the event' },
                                    method: { type: 'string', description: 'HTTP or audit method used for the event' },
                                    metadata: {
                                        type: 'array',
                                        description: 'List of metadata parameters',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                parameter: {
                                                    type: 'object',
                                                    properties: {
                                                        key: { type: 'string', description: 'Parameter name or identifier' },
                                                        value: { type: 'string', description: 'Parameter value' }
                                                    },
                                                    required: ['key', 'value']
                                                }
                                            },
                                            required: ['parameter']
                                        }
                                    }
                                },
                                required: ['account', 'area', 'company', 'client-ip', 'allowed', 'message', 'time', 'token']
                            }
                        }
                    },
                    required: ['account', 'auditLogs']
                }
            }
        },
        required: []
    }
};

export const PMC_AUDIT_LOGS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    pmc_get_audit_log_history: [{
        name: 'AuditFilter',
        options: ['put']
    }]
};

export const PMC_AUDIT_LOGS_TOOLS_DEFINITIONS = [
    PMC_GET_AUDIT_LOG_HISTORY_TOOL
] as const;
