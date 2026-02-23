import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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
                            enum: ['o365-admin', 'dynamics365', 'sforce', 'gsuite', 'powerbi', 'zendesk', 'azure-do', 'azure-ad', 'dsl'],
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
    description: 'Get the health status of a connector. You can provide either the connector GUID or the connector name (full or partial).',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose health status you want'
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
                description: 'Status of the connector health'
            }
        },
        required: ['health']
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
    }]
};

export const CONNECTOR_TOOLS_DEFINITIONS = [
    GET_KEEPIT_CLOUD_CONNECTORS_TOOL,
    GET_KEEPIT_CONNECTOR_HEALTH_TOOL
] as const;
