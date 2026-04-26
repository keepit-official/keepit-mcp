import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const outputSchema = {
    type: 'object',
    properties: {
        jobs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    guid: {
                        type: 'string',
                        description: 'Unique GUID for the job'
                    },
                    description: {
                        type: 'string',
                        description: 'Job description with connector details'
                    },
                    active: {
                        type: 'boolean',
                        description: 'Whether the job is currently active/running'
                    },
                    start: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the job actually started'
                    },
                    scheduled: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the job was originally scheduled to start'
                    },
                    type: {
                        type: 'string',
                        description: 'Type of job (backup/restore)'
                    },
                    execsummary: {
                        type: 'string',
                        description: 'XML execution summary containing error messages, exit reasons, and completion details'
                    },
                    dispatched: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the job was dispatched to a worker'
                    },
                    started: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the job execution actually began'
                    },
                    failed: {
                        type: ['string', 'null'],
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the job failed, or null if job succeeded'
                    },
                    progress: {
                        type: 'string',
                        description: 'Job completion progress as a decimal string (e.g., "0.0" to "1.0")'
                    }
                },
                required: ['guid', 'description', 'active', 'start', 'scheduled']
            },
            description: 'List of currently active backup and restore jobs'
        }
    },
    required: ['jobs']
} as const satisfies Tool['outputSchema'];

const GET_ACTIVE_JOBS_TOOL = {
    name: 'get_active_jobs',
    description: 'Get a list of active jobs, including their statuses and creation dates',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose job history you want'
            },
            account_id: {
                type: 'string',
                description: 'Optional account ID for scoped connector resolution'
            },
            scope: {
                type: 'string',
                enum: ['account', 'children', 'leaf', 'managed', 'all'],
                description: 'Optional account scope for connector resolution'
            }
        },
        required: ['guid'],
        additionalProperties: false
    },
    outputSchema
} as const satisfies Tool;

const GET_JOB_HISTORY_TOOL = {
    name: 'get_job_history',
    description: 'Get a list of backup and/or restore jobs for a connector',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose job history you want'
            },
            account_id: {
                type: 'string',
                description: 'Optional account ID for scoped connector resolution'
            },
            scope: {
                type: 'string',
                enum: ['account', 'children', 'leaf', 'managed', 'all'],
                description: 'Optional account scope for connector resolution'
            },
            duration: {
                type: 'string',
                description: 'How far back to look, as an ISO 8601 duration (maximum 90 days). Examples: "P7D" = 7 days, "P30D" = 30 days. Cannot be used together with startTime/endTime.'
            },
            startTime: {
                type: 'string',
                description: 'Start of the date range as an ISO 8601 timestamp (e.g. "2025-07-01T00:00:00Z"). Cannot be used together with duration. The range cannot exceed 90 days.'
            },
            endTime: {
                type: 'string',
                description: 'End of the date range as an ISO 8601 timestamp (e.g. "2025-09-30T23:59:59Z"). Defaults to now if omitted. Cannot be used together with duration.'
            }
        },
        required: ['guid'],
        additionalProperties: false
    },
    outputSchema
} as const satisfies Tool;

export const JOBS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_active_jobs: [{
        name: 'DevJobs',
        options: ['get']
    }],
    get_job_history: [{
        name: 'DevJobs',
        options: ['put']
    }]
};

export const JOBS_TOOLS_DEFINITIONS = [
    GET_ACTIVE_JOBS_TOOL,
    GET_JOB_HISTORY_TOOL
] as const;
