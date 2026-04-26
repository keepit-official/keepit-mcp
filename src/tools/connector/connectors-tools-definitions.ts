import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const ACCOUNT_ID_PROPERTY = {
    account_id: {
        type: 'string',
        description: 'Optional account ID. In this MCP, account means the same business concept as client, customer, or tenant.'
    }
} as const;

const SCOPE_PROPERTY = {
    scope: {
        type: 'string',
        enum: ['account', 'children', 'leaf', 'managed', 'all'],
        description: 'Scope for connector lookups. Use "account" for the selected or authenticated root account, "children" for its direct child accounts, "leaf" for all descendant leaf accounts under that root, "managed" for leaf accounts under MSP-managed branches plus any directly-owned leaf accounts under a mixed root, or "all" for the root account plus its direct child accounts.'
    }
} as const;

const connectorObjectSchema = {
    type: 'object',
    properties: {
        guid: { type: 'string', description: 'Unique identifier for the connector' },
        name: { type: ['string', 'null'], description: 'Display name of the connector' },
        account_id: { type: 'string', description: 'Owning account ID' },
        account_name: { type: ['string', 'null'], description: 'Owning account name when available' },
        created: { type: ['string', 'null'], format: 'date-time', description: 'Connector creation timestamp' },
        orglink: { type: ['string', 'null'], description: 'Organization link ID' },
        type: { type: ['string', 'null'], description: 'Raw connector type code' },
        type_label: { type: ['string', 'null'], description: 'Friendly connector type label when available' },
        backup_retention: { type: ['string', 'null'], description: 'Backup retention period' },
        retention_updated: { type: ['string', 'null'], format: 'date-time', description: 'Retention update timestamp' }
    },
    required: ['guid', 'account_id']
} as const;

const GET_KEEPIT_CLOUD_CONNECTORS_TOOL: Tool = {
    name: 'get_cloud_connectors',
    description: 'List connectors in the requested account scope. Use this to discover connector GUIDs before calling health or summary tools. When account_id is omitted, the default scope is the authenticated/root account plus its direct child accounts.',
    inputSchema: {
        type: 'object',
        properties: {
            ...ACCOUNT_ID_PROPERTY,
            ...SCOPE_PROPERTY
        },
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            connectors: {
                type: 'array',
                items: connectorObjectSchema,
                description: 'List of backup connectors in scope'
            }
        },
        required: ['connectors']
    }
};

const FIND_CONNECTOR_TOOL = {
    name: 'find_connector',
    description: 'Find connectors across the requested account scope using a partial or exact name or GUID. Use this when you know part of the connector name but not the GUID.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Partial or exact connector name or GUID'
            },
            ...ACCOUNT_ID_PROPERTY,
            ...SCOPE_PROPERTY
        },
        required: ['query'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            connectors: {
                type: 'array',
                items: connectorObjectSchema
            }
        },
        required: ['connectors']
    }
} as const satisfies Tool;

const GET_KEEPIT_CONNECTOR_HEALTH_TOOL = {
    name: 'get_connector_health',
    description: 'Get the health status for exactly one connector. Provide either guid or connector_name, not both. If connector_name could match multiple connectors, call find_connector first to resolve the GUID.',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the connector whose health status you want'
            },
            connector_name: {
                type: 'string',
                description: 'Connector name, full name, or partial name to resolve before fetching health'
            },
            ...ACCOUNT_ID_PROPERTY,
            ...SCOPE_PROPERTY
        },
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            connector: connectorObjectSchema,
            health: {
                type: 'string',
                enum: ['healthy', 'unhealthy', 'critical', 'unknown'],
                description: 'Status of the connector health'
            }
        },
        required: ['connector', 'health']
    }
} as const satisfies Tool;

export const CONNECTORS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_cloud_connectors: [{
        name: 'Devices',
        options: ['get']
    }],
    find_connector: [{
        name: 'Devices',
        options: ['get']
    }],
    get_connector_health: [{
        name: 'Devices',
        options: ['get']
    }, {
        name: 'DevHealth',
        options: ['get']
    }]
};

export const CONNECTOR_TOOLS_DEFINITIONS = [
    GET_KEEPIT_CLOUD_CONNECTORS_TOOL,
    FIND_CONNECTOR_TOOL,
    GET_KEEPIT_CONNECTOR_HEALTH_TOOL
] as const;
