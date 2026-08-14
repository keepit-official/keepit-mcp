import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const GET_LATEST_SNAPSHOT_TOOL = {
    name: 'get_latest_snapshot',
    description: 'Get the timestamp of the most recent completed snapshot for a connector',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose latest snapshot timestamp you want'
            }
        },
        required: ['guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            snapshot: {
                type: 'object',
                properties: {
                    account: {
                        type: 'string',
                        description: 'Account GUID associated with the snapshot'
                    },
                    size: {
                        type: 'string',
                        description: 'Size of the snapshot (in bytes)'
                    },
                    tstamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp of the latest created snapshot (GMT)'
                    },
                    type: {
                        type: 'string',
                        enum: ['p', 'c'],
                        description: 'Shows if the snapshot was complete (c) or partial (p)'
                    }
                },
                required: ['size', 'tstamp', 'type'],
                description: 'The info about the latest snapshot of a given device'
            }
        },
        required: ['snapshot']
    }
} as const satisfies Tool;

const GET_SNAPSHOT_RANGE_TOOL = {
    name: 'get_snapshot_range',
    description: 'Get a list of snapshots for a connector within a given time range',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose snapshot data you want.'
            },
            start: {
                type: 'string',
                description: 'Start date (ISO 8601). If omitted, server uses current time.'
            },
            span: {
                type: 'string',
                description: 'Duration (ISO 8601) for the range of snapshots. (e.g., "P7D" for 7 days, "P1M" for 1 month)',
                default: 'P7D'
            },
            reverse: {
                type: 'boolean',
                description: 'If true, query snapshots in reverse order, with the newest one first',
                default: false
            },
            count: {
                type: 'integer',
                description: 'Number of snapshots to return',
                default: 99
            }
        },
        required: ['guid', 'start', 'span', 'count'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            snapshots: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            description: 'ISO 8601 timestamp when the snapshot was created'
                        },
                        type: {
                            type: 'string',
                            enum: ['p', 'c'],
                            description: 'Shows if the snapshot was complete (c) or partial (p)'
                        },
                        size: {
                            type: 'string',
                            description: 'Size of the snapshot data (in bytes)'
                        },
                        account: {
                            type: 'string',
                            description: 'GUID of the account associated with this snapshot'
                        }
                    },
                    required: ['timestamp', 'type', 'size', 'account']
                },
                description: 'List of snapshots within the specified time range'
            }
        },
        required: ['snapshots']
    }
} as const satisfies Tool;

export const SNAPSHOT_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_latest_snapshot: [{
        name: 'History',
        options: ['get']
    }],
    get_snapshot_range: [{
        name: 'History',
        options: ['put']
    }]
};

export const SNAPSHOT_TOOLS_DEFINITIONS = [
    GET_LATEST_SNAPSHOT_TOOL,
    GET_SNAPSHOT_RANGE_TOOL
] as const;
