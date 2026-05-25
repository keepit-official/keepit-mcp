import type { IToolRequiredAcl } from '../../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const PMC_GET_ALL_CRITICAL_CONNECTORS_TOOL: Tool = {
    name: 'pmc_get_all_critical_connectors',
    title: 'Get all critical connectors',
    description: `List all connectors currently in a critical state across all subaccounts managed by the partner.
        Always show the disclaimer field at the top of the response before any data.
        Start with the total count: "{connectorCount} critical connectors found."
        Present the connectors as a table with exactly these columns in this order — do not skip any column: Device ID (device-guid), Device name (device-name), Device type (device-type), Account ID (account-guid), Account name (account-name), Account email (account-email), Company (account-company), Failure reason (failureReason).`,
    inputSchema: {
        type: 'object',
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            disclaimer: {
                type: 'string',
                description: 'Non-real-time data warning that must be shown to the partner on every response'
            },
            connectors: {
                type: 'array',
                description: 'List of connectors currently in a critical state across all subaccounts',
                items: {
                    type: 'object',
                    properties: {
                        'device-guid': { type: 'string', description: 'Unique ID of the connector' },
                        'device-name': { type: 'string', description: 'Display name of the connector' },
                        'device-type': { type: 'string', description: 'Connector type (e.g. o365-admin, gsuite)' },
                        'account-guid': { type: 'string', description: 'GUID of the subaccount that owns this connector' },
                        'account-name': { type: 'string', description: 'Full name of the subaccount' },
                        'account-email': { type: 'string', description: 'Email address of the subaccount' },
                        'account-company': { type: 'string', description: 'Company name associated with the subaccount' },
                        failureReason: { type: 'string', description: 'Human-readable description of why the connector is in a critical state' }
                    },
                    required: ['device-guid', 'device-name', 'device-type', 'account-guid', 'account-name', 'account-email', 'account-company', 'failureReason']
                }
            }
        },
        required: ['disclaimer', 'connectors']
    }
};

const PMC_GET_SUBACCOUNT_CONNECTORS_TOOL: Tool = {
    name: 'pmc_get_subaccount_connectors',
    title: 'Get subaccount connectors',
    description: `Returns a list of cloud connectors configured for a managed customer account.

Present results as a table with columns in this order: ID (guid), Connector name (name), Type (type), Created (created).

If the list is empty, say "No connectors configured for this account."`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'Unique ID of the customer account'
            }
        },
        required: ['customer_guid'],
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
                            description: 'Unique ID of the connector'
                        },
                        name: {
                            type: 'string',
                            description: 'Display name of the connector'
                        },
                        created: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Date and time when the connector was created'
                        },
                        type: {
                            type: 'string',
                            description: 'Connector type (o365-admin, gsuite, etc.)'
                        }
                    },
                    required: ['guid', 'name', 'type', 'created']
                },
                description: 'List of connectors for the customer'
            }
        },
        required: ['connectors']
    }
};

const PMC_GET_CONNECOTRS_HEALTH_SUMMARY: Tool = {
    name: 'pmc_get_connectors_health_summary',
    title: 'Get subaccount connectors health summary',
    description: `Returns a list of cloud connectors with current health status, last backup date, and failure details for any unhealthy connectors.

Present results as a table with columns in this order: ID (guid), Connector name (name), Type (type), Created (created), Status (healthStatus), Last backup (lastBackupAt — show "No backup yet" if empty).

For any connector where failureReason is present, add an indented note beneath its row: "Issue: {failureReason}".

If the list is empty, say "No connectors found for this account."`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'Unique ID of the customer account'
            }
        },
        required: ['customer_guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            connectorsHealth: {
                type: 'array',
                description: 'List of connectors with health data for the customer. Includes current health status, last backup date, and failure details for any unhealthy connectors.',
                items: {
                    type: 'object',
                    properties: {
                        guid: {
                            type: 'string',
                            description: 'Unique ID of the connector'
                        },
                        name: {
                            type: 'string',
                            description: 'Display name of the connector'
                        },
                        created: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Date and time when the connector was created'
                        },
                        type: {
                            type: 'string',
                            description: 'Connector type (o365-admin, gsuite, etc.)'
                        },
                        lastBackupAt: {
                            type: 'string',
                            description: 'Date and time of the last successful backup. Empty if no backup has completed yet.'
                        },
                        healthStatus: {
                            type: 'string',
                            enum: ['healthy', 'unhealthy', 'critical', 'unknown'],
                            description: 'Current health status of the connector'
                        },
                        failureReason: {
                            type: 'string',
                            description: 'Explains why the connector is not healthy — present only when healthStatus is unhealthy or critical'
                        }
                    },
                    required: ['guid', 'name', 'created', 'type', 'lastBackupAt', 'healthStatus']
                }
            }
        },
        required: ['connectorsHealth']
    }
};

const PMC_GET_CONNECTOR_ISSUE_SOLUTION_TOOL: Tool = {
    name: 'pmc_get_connector_issue_solution',
    title: 'Get connector issue solution',
    description: `Returns the current health status of a specific connector. When the connector is not healthy, also provides a failure explanation and a link to a resolution guide. Use connector_guid and connector_type from the health summary results.

Present the result as a brief status block: show healthStatus as the headline status. If the connector is not healthy, show failureReason on the next line, then solutionUrl as a hyperlink labelled "View resolution guide".`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'Unique ID of the customer account'
            },
            connector_guid: {
                type: 'string',
                description: 'Unique ID of the connector to check'
            },
            connector_type: {
                type: 'string',
                description: 'Type of the connector (e.g. o365-admin, gsuite). When provided, returns a more specific help article for the issue.'
            }
        },
        required: ['customer_guid', 'connector_guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            healthStatus: {
                type: 'string',
                enum: ['healthy', 'unhealthy', 'critical', 'unknown'],
                description: 'Current health status of the connector'
            },
            failureReason: {
                type: 'string',
                description: 'Explains why the connector is not healthy — present only when connector is not healthy'
            },
            solutionUrl: {
                type: 'string',
                description: 'Link to a help article or support page for resolving the issue — present only when connector is not healthy'
            }
        },
        required: ['healthStatus']
    }
};

export const PMC_CONNECTORS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    pmc_get_all_critical_connectors: [
        { name: 'Devices', options: ['get'] },
        { name: 'DevStatus', options: ['get'] }
    ],
    pmc_get_subaccount_connectors: [
        { name: 'Devices', options: ['get'] }
    ],
    pmc_get_connectors_health_summary: [
        { name: 'Devices', options: ['get'] },
        { name: 'DevStatus', options: ['get'] },
        { name: 'DevHealth', options: ['get'] },
        { name: 'History', options: ['get'] }
    ],
    pmc_get_connector_issue_solution: [
        { name: 'DevStatus', options: ['get'] },
        { name: 'DevHealth', options: ['get'] }
    ]
};

export const PMC_CONNECTORS_TOOLS_DEFINITIONS = [
    PMC_GET_ALL_CRITICAL_CONNECTORS_TOOL,
    PMC_GET_SUBACCOUNT_CONNECTORS_TOOL,
    PMC_GET_CONNECOTRS_HEALTH_SUMMARY,
    PMC_GET_CONNECTOR_ISSUE_SOLUTION_TOOL
] as const;
