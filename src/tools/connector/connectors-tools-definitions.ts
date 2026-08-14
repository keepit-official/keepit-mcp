import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CONNECTOR_TYPES = [
    'o365-admin',
    'dynamics365',
    'sforce',
    'gsuite',
    'powerbi',
    'zendesk',
    'azure-do',
    'azure-ad',
    'okta',
    'docusign',
    'miro',
    'jira',
    'confluence',
    'bamboohr',
    'monday',
    'gitlab',
    'servicenow',
    'autodesk-forma',
    'slack',
    'github'
] as const;

export const JOB_TYPES = [
    'backup',
    'srestore',
    'restore',
    'pstrestore',
    'zipdownload',
    'pmrestore'
] as const;

const GET_KEEPIT_CLOUD_CONNECTORS_TOOL: Tool = {
    name: 'get_cloud_connectors',
    description: 'Get a list of cloud connectors in your account',
    inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            connectors: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        guid: {
                            type: 'string',
                            description: 'Unique identifier for the connector'
                        },
                        name: {
                            type: 'string',
                            description: 'Display name of the connector'
                        },
                        created: {
                            type: 'string',
                            format: 'date-time',
                            description: 'ISO 8601 timestamp when the connector was created'
                        },
                        orglink: {
                            type: 'string',
                            description: 'Organization link ID'
                        },
                        type: {
                            type: 'string',
                            enum: [...CONNECTOR_TYPES],
                            description: 'Connector type'
                        },
                        backup_retention: {
                            type: 'string',
                            description: 'Backup retention period (in ISO 8601 standard)'
                        },
                        retention_updated: {
                            type: 'string',
                            format: 'date-time',
                            description: 'When the retention policy was last updated (in ISO 8601 standard)'
                        }
                    },
                    required: ['guid', 'name', 'created', 'orglink', 'type']
                },
                description: 'List of backup connectors in the account'
            }
        },
        required: ['connectors']
    }
};

const GET_KEEPIT_CONNECTOR_HEALTH_TOOL = {
    name: 'get_connector_health',
    description: 'Get the health status of a connector. Avoid this tool for onboarding check.',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose health status you want'
            },
            reason: {
                type: 'boolean',
                description: 'If true, returns health reasons for the connector.',
                default: true
            }
        },
        required: ['guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            health: {
                type: 'string',
                enum: ['healthy', 'unhealthy', 'critical'],
                description: 'Status of the connector health, a healthy connector means that backups are running regularly, an unhealthy connector means something may go wrong and you need to look into it, A critical connector means that something is wrong and that the backup cannot run properly.'
            },
            reason: {
                type: 'string',
                description: 'Unique reason for the connector health status'
            }
        },
        required: ['health']
    }
} as const satisfies Tool;

const GET_KEEPIT_AGGREGATED_CONNECTOR_HEALTH_TOOL = {
    name: 'get_aggregated_connector_health',
    description: 'Retrieve aggregated health statuses and reasons across connectors. Avoid this tool for onboarding check. Scope results to a specific connector type using the type parameter; omit it to get health data for all connector types combined.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Type of connectors, whose health status and reason you want'
            },
            reason: {
                type: 'boolean',
                description: 'If true, returns health reasons for each connector.',
                default: true
            }
        },
        required: [],
        additionalProperties: false

    },
    outputSchema: {
        type: 'object',
        properties: {
            devHealth: {
                type: 'array',
                description: 'Array of connectors includes their GUID, health status and reason',
                items: {
                    type: 'object',
                    description: 'Object with device which have guid, health status and reason',
                    properties: {
                        guid: { 
                            type: 'string',
                            description: 'GUID of the connector whose health status and reason value you want'
                        },
                        health: {
                            type: 'string',
                            enum: ['healthy', 'unhealthy', 'critical'],
                            description: 'Status of the connector health, a healthy connector means that backups are running regularly, an unhealthy connector means something may go wrong and you need to look into it, A critical connector means that something is wrong and that the backup cannot run properly.'
                        },
                        reason: {
                            type: 'string',
                            description: 'Unique reason for the connector health status'
                        }
                    },
                    required: ['guid', 'health'],
                    additionalProperties: false
                }
            }
        },
        required: ['devHealth'],
        additionalProperties: false
    }
} as const satisfies Tool;

const GET_KEEPIT_CONNECTOR_RSI_SUMMARY_TOOL = {
    name: 'get_connector_rsi_summary',
    description: 'Get recurrently skipped items (RSI) counts of a connector. To get summarized info for all devices of the same type, use get_aggregated_rsi_summary tool.',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose number of recurrently skipped items you want'
            }
        },
        required: ['guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            failedFiles: {
                type: 'number',
                description: 'Number of recurrently skipped files'
            },
            failedFolders: {
                type: 'number',
                description: 'Number of recurrently skipped folders'
            }
        },
        required: ['failedFiles', 'failedFolders']
    }
} as const satisfies Tool;

const GET_KEEPIT_AGGREGATED_RSI_SUMMARY_TOOL = {
    name: 'get_aggregated_rsi_summary',
    description: 'Get aggregated recurrently skipped items (RSI) counts across all connectors. Aggregated means that recurrently skipped items (RSI) for all connectors or connectors of selected type will be returned. Recurrently skipped means not backed up several snapshots in a row. Use this tool when the request covers multiple connectors or all devices — especially when no specific device type is specified.',
    inputSchema: {
        type: 'object',
        properties: {
            'device_type': {
                type: 'string',
                description: 'Connector type to filter aggregated recurrently skipped items. Omit to include all connector types.'
            }
        },
        required: []
    },
    outputSchema: {
        type: 'object',
        properties: {
            failedFiles: {
                type: 'number',
                description: 'Number of aggregated recurrently skipped files'
            },
            failedFolders: {
                type: 'number',
                description: 'Number of aggregated recurrently skipped folders'
            }
        },
        required: ['failedFiles', 'failedFolders']
    }
} as const satisfies Tool;

export const CONNECTORS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_cloud_connectors: [{
        name: 'Devices',
        options: ['get']
    }],
    get_connector_health: [{
        name: 'DevHealth',
        options: ['get']
    }],
    get_aggregated_connector_health: [{
        name: 'DevHealth',
        options: ['get']
    }],
    get_connector_rsi_summary: [{
        name: 'DevRsiReport',
        options: ['get']
    }],
    get_aggregated_rsi_summary: [{
        name: 'DevRsi',
        options: ['get']
    }]
};

export const CONNECTOR_TOOLS_DEFINITIONS = [
    GET_KEEPIT_CLOUD_CONNECTORS_TOOL,
    GET_KEEPIT_CONNECTOR_HEALTH_TOOL,
    GET_KEEPIT_AGGREGATED_CONNECTOR_HEALTH_TOOL,
    GET_KEEPIT_CONNECTOR_RSI_SUMMARY_TOOL,
    GET_KEEPIT_AGGREGATED_RSI_SUMMARY_TOOL
] as const;
