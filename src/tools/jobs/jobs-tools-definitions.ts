import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CONNECTOR_TYPES, JOB_TYPES } from '../connector/connectors-tools-definitions.js';

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

const GET_JOBS_COUNT_TOOL = {
    name: 'get_jobs_count',
    description: 'Get list of jobs count for a single connector, by connector name or GUID. Jobs count is a part of "Recovery insights", which also matches: recovery insights, job activity, backup/restore counts, success/failure trends, job volume over time. "Recovery insights" are NOT recurrently skipped items (RSI) — for that use get_connector_rsi_summary. For all connectors or all connectors of one type, use get_aggregated_jobs_count. By default show info for all job-types.',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose jobs count you want'
            },
            'job-types': {
                type: 'array',
                description: 'Array of job-types of each connector',
                items: {
                    type: 'string',
                    enum: [...JOB_TYPES]
                }
            },
            from: {
                type: 'string',
                format: 'date-time',
                description: 'Start date in ISO 8601 timestamp format, from which the jobs count should be collected'
            },
            to: {
                type: 'string',
                format: 'date-time',
                description: 'End date in ISO 8601 timestamp format, which indicates the upper time of collecting jobs count. If it isn\'t defined, then current timestamp will be defined as upper time'
            }
        },
        required: ['guid', 'job-types', 'from'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            'jobs-count': {
                type: 'array',
                description: 'Contains jobs count data for defined connector with it\'s job-types',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            enum: [...JOB_TYPES]
                        },
                        scheduled: {
                            type: 'number',
                            description: 'Number of scheduled items of defined job-type for a connector'
                        },
                        'in-progress': {
                            type: 'number',
                            description: 'Number of "in-progress" items of defined job-type for a connector'
                        },
                        cancelled: {
                            type: 'number',
                            description: 'Number of cancelled items of defined job-type for a connector'
                        },
                        successful: {
                            type: 'number',
                            description: 'Number of successful items of defined job-type for a connector'
                        },
                        incomplete: {
                            type: 'number',
                            description: 'Number of incomplete items of defined job-type for a connector'
                        },
                        unsuccessful: {
                            type: 'number',
                            description: 'Number of unsuccessful items of defined job-type for a connector'
                        }
                    },
                    required: ['name', 'scheduled', 'in-progress', 'cancelled', 'successful', 'incomplete', 'unsuccessful']
                }
            }
        },
        required: ['jobs-count'],
        additionalProperties: false
    }
} as const satisfies Tool;

const GET_AGGREGATED_JOBS_COUNT_TOOL = {
    name: 'get_aggregated_jobs_count',
    description: 'Get aggregated jobs count per connector over a time window - this is the "Recovery insights" data source. Aggregated means "jobs count for all connectors". Returns, for each connector, the number of backup/restore jobs broken down by job-type (and status) between `from` and `to`. Use this whenever the user asks for "recovery insights", backup/restore job activity, or success/failure trends across multiple devices of the same type or all devices — ESPECIALLY when a time period is mentioned (e.g. "last two weeks"), since this tool is date-ranged via `from`/`to`. This is NOT the same as recurrently skipped items (RSI): RSI (get_aggregated_rsi_summary) reports the current count of items skipped across several consecutive snapshots and has no time window. Aggregated = counts for all connectors, or all connectors of one type when `device-type` is given. For a single connector, use get_jobs_count. By default show info for all job-types.',
    inputSchema: {
        type: 'object',
        properties: {
            'device-type': {
                type: 'string',
                description: 'Connector type, for which aggregated jobs count you want. If device-type is provided, jobs count for all connectors of the same type will be returned. If device-type isn\'t provided - jobs count for all devices will be returned.',
                enum: [...CONNECTOR_TYPES]
            },
            'job-types': {
                type: 'array',
                description: 'Array of job-types of each connector. If this parameter isn\'t provided, the tool will return jobs count for all available job-types.',
                items: {
                    type: 'string',
                    enum: [...JOB_TYPES]
                }
            },
            from: {
                type: 'string',
                format: 'date-time',
                description: 'Start date in ISO 8601 timestamp format, from which the jobs count should be collected'
            },
            to: {
                type: 'string',
                format: 'date-time',
                description: 'End date in ISO 8601 timestamp format, which indicates the upper time of collecting jobs count. If it isn\'t defined, then current timestamp will be defined as upper time'
            }
        },
        required: ['from'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            'jobs-count': {
                type: 'array',
                description: 'Contains jobs count data for each connector of defined connector type',
                items: {
                    type: 'object',
                    properties: {
                        guid: {
                            type: 'string',
                            description: 'GUID of single connector of defined connector type, whose jobs count you want'
                        },
                        counts: {
                            type: 'array',
                            description: 'List of jobs count data for specific connector, collected by job-type',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        enum: [...JOB_TYPES]
                                    },
                                    scheduled: {
                                        type: 'number',
                                        description: 'Number of scheduled items of defined job-type for a connector'
                                    },
                                    'in-progress': {
                                        type: 'number',
                                        description: 'Number of "in-progress" items of defined job-type for a connector'
                                    },
                                    cancelled: {
                                        type: 'number',
                                        description: 'Number of cancelled items of defined job-type for a connector'
                                    },
                                    successful: {
                                        type: 'number',
                                        description: 'Number of successful items of defined job-type for a connector'
                                    },
                                    incomplete: {
                                        type: 'number',
                                        description: 'Number of incomplete items of defined job-type for a connector'
                                    },
                                    unsuccessful: {
                                        type: 'number',
                                        description: 'Number of unsuccessful items of defined job-type for a connector'
                                    }
                                },
                                required: ['name', 'scheduled', 'in-progress', 'cancelled', 'successful', 'incomplete', 'unsuccessful']
                            }
                        }
                    },
                    required: ['guid', 'counts']
                }
            }
        },
        required: ['jobs-count']
    }
} as const satisfies Tool;

export const JOBS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_active_jobs: [{
        name: 'DevJobs',
        options: ['get']
    }],
    get_job_history: [{
        name: 'DevJobs',
        options: ['put']
    }],
    get_jobs_count: [{
        name: 'DevJobsCount',
        options: ['get']
    }],
    get_aggregated_jobs_count: [{
        name: 'DevJobsCount',
        options: ['get']
    }]
};

export const JOBS_TOOLS_DEFINITIONS = [
    GET_ACTIVE_JOBS_TOOL,
    GET_JOB_HISTORY_TOOL,
    GET_JOBS_COUNT_TOOL,
    GET_AGGREGATED_JOBS_COUNT_TOOL
] as const;
