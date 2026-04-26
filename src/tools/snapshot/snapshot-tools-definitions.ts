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
                        description: 'Shows if the snapshot was complete or partial (c/p)'
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
            account_id: {
                type: 'string',
                description: 'Optional account ID for scoped connector resolution'
            },
            scope: {
                type: 'string',
                enum: ['account', 'children', 'leaf', 'managed', 'all'],
                description: 'Optional account scope for connector resolution'
            },
            startTime: {
                type: 'string',
                description: 'Anchor timestamp (ISO 8601) for the snapshot query. If omitted, the server uses the current time.'
            },
            timespan: {
                type: 'string',
                description: 'Duration (ISO 8601) for the snapshot window. With the default reverse=true, omitting startTime and using P7D means "the last 7 days".',
                default: 'P7D'
            },
            reverse: {
                type: 'boolean',
                description: 'When true, search backward from startTime and return newest snapshots first. This is the default because most queries want recent history.',
                default: true
            },
            count: {
                type: 'integer',
                description: 'Number of snapshots to return',
                default: 99
            }
        },
        required: ['guid'],
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
                            description: 'Type of snapshot'
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
                    required: ['timestamp']
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
