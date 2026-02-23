import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';

const GET_KEEPIT_AUDIT_LOG_HISTORY = {
    name: 'get_audit_log_history',
    description: 'Get a list of audit log events for a specified period',
    inputSchema: {
        type: 'object',
        properties: {
            duration: {
                type: 'string',
                description: 'Duration (in ISO 8601 format) to look back for job history. (e.g., "P7D" for 7 days, "P1M" for 1 month)'
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of records to return (default: 50). Server enforces this limit in the API request.',
                default: 50
            },
            offset: {
                type: 'integer',
                description: 'Offset for fetching the next page of results. Use the nextOffset value from the previous response.',
                default: 0
            }
        },
        required: ['duration'],
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
                        account: {
                            type: 'string',
                            description: 'Account identifier associated with the audit event'
                        },
                        acl: {
                            type: 'string',
                            description: 'ACL identifying an endpoint'
                        },
                        token: {
                            type: 'string',
                            description: 'Token (aname) which performed an audited action'
                        },
                        action: {
                            type: 'string',
                            description: 'Specific action that was performed'
                        },
                        area: {
                            type: 'string',
                            description: 'Area where the action occurred'
                        },
                        allowed: {
                            type: 'boolean',
                            description: 'Indicates where an action was allowed by the system'
                        },
                        company: {
                            type: 'string',
                            description: 'Companyname of the account that triggered this action'
                        },
                        device: {
                            type: 'string',
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
                            type: 'string',
                            description: 'IP address of the client that performed the action'
                        },
                        time: {
                            type: 'string',
                            format: 'date-time',
                            description: 'ISO 8601 timestamp when the audit event occurred'
                        },
                        method: {
                            type: 'string',
                            description: 'Method applied in the audit event'
                        },
                        metadata: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    parameter: {
                                        type: 'object',
                                        properties: {
                                            key: {
                                                type: 'string',
                                                description: 'Parameter name or identifier'
                                            },
                                            value: {
                                                type: 'string',
                                                description: 'Parameter value'
                                            }
                                        },
                                        required: ['key', 'value'],
                                        description: 'Key-value pair representing a metadata parameter'
                                    }
                                },
                                required: ['parameter']
                            },
                            description: 'List of metadata parameters'
                        }
                    },
                    required: ['client-ip', 'acl', 'allowed', 'method', 'message', 'succeeded', 'metadata', 'time', 'token']
                },
                description: 'List of audit log records for the specified time period'
            },
            pagination: {
                type: 'object',
                properties: {
                    hasMorePages: {
                        type: 'boolean',
                        description: 'Indicates if more records are available beyond the current response'
                    },
                    nextOffset: {
                        type: 'string',
                        description: 'Offset value to be used for fetching the next page of results'
                    },
                    totalInResponse: {
                        type: 'integer',
                        description: 'Total number of records returned in the current response'
                    }
                }
            }
        },
        required: ['auditLogs', 'pagination']
    }
} as const satisfies Tool;

export const AUDIT_LOG_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_audit_log_history: [{
        name: 'AuditFilter',
        options: ['put']
    }]
};

export const AUDIT_LOG_TOOLS_DEFINITIONS = [
    GET_KEEPIT_AUDIT_LOG_HISTORY
] as const;
