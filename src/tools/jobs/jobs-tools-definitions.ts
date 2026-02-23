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
            duration: {
                type: 'string',
                description: 'Duration (in ISO 8601 format) to look back for job history. (e.g., "P7D" for 7 days, "P1M" for 1 month)',
                default: 'P7D'
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
