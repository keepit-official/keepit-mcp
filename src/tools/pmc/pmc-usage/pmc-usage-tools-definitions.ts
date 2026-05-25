import type { IToolRequiredAcl } from '../../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WORKLOAD_TYPES } from '../../../api/seat-limit-api.js';

const PMC_GET_EXCEEDING_SEAT_LIMIT_TOOL: Tool = {
    name: 'pmc_get_exceeding_seat_limit',
    title: 'Get subaccounts exceeding seat limit',
    description: `Get all portfolio accounts exceeding their seat limits, including overage, grace expiry date, and grace-expired status. Optional filter by connector type.
        Start the response with the total count: "{accountCount} accounts exceeding seat limits found."
        Present the accounts as a table with exactly these columns in this order — do not skip any column: Account ID (guid), Email (email), Company (company_name), Violations count (resources-violation.length).
        For each account, present its violations as a nested table with exactly these columns in this order — do not skip any column: Connector type (name), Resource (resource_name), Resource name (readable-name), Limit (limit), Usage (usage), Overage (overage), Grace expires (grace-expires), Grace expired (isGraceExpired).`,
    inputSchema: {
        type: 'object',
        properties: {
            'resource-group': {
                type: 'array',
                items: {
                    type: 'string',
                    enum: [...WORKLOAD_TYPES]
                },
                description: 'Optional connector types to include; returns violations only for connectors (e.g., "o365-admin", "gsuite").'
            }
        },
        required: [],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            accounts: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        guid: {
                            type: 'string',
                            description: 'Unique identifier of the customer account'
                        },
                        email: {
                            type: 'string',
                            description: 'Email address of the account'
                        },
                        company_name: {
                            type: 'string',
                            description: 'Company name of the account'
                        },
                        type: {
                            type: 'string',
                            description: 'Type of the account'
                        },
                        'resources-violation': {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Type of the connector (e.g. "o365-admin")'
                                    },
                                    resource_name: {
                                        type: 'string',
                                        description: 'Internal resource name (e.g. "m365-mailboxonedrive-total")'
                                    },
                                    'readable-name': {
                                        type: 'string',
                                        description: 'Human-readable resource name'
                                    },
                                    limit: {
                                        type: 'number',
                                        description: 'Seat limit for the resource'
                                    },
                                    usage: {
                                        type: 'number',
                                        description: 'Current seat usage'
                                    },
                                    overage: {
                                        type: 'number',
                                        description: 'Number of seats over the limit (usage - limit)'
                                    },
                                    'grace-expires': {
                                        type: 'string',
                                        format: 'date-time',
                                        description: 'ISO 8601 timestamp when the grace period expires'
                                    },
                                    isGraceExpired: {
                                        type: 'boolean',
                                        description: 'Whether the grace period has already expired'
                                    }
                                },
                                required: ['name', 'resource_name', 'readable-name', 'limit', 'usage', 'overage', 'grace-expires', 'isGraceExpired']
                            },
                            description: 'List of seat limit violations for the account'
                        }
                    },
                    required: ['guid', 'email', 'company_name', 'resources-violation']
                },
                description: 'List of accounts exceeding their seat limits'
            }
        },
        required: ['accounts']
    }
};

const GET_SEATS_ALLOCATION_TOOL: Tool = {
    name: 'pmc_get_seats_allocation',
    title: 'Get seats allocation',
    description: `Get seat allocation per connector within a date range. When customer_guid is provided, returns allocation for that subaccount; otherwise returns allocation for the partner account.
        Start the response with the totals summary: "Account type: {account-type} | Active connectors: {connectors-count} | Total peak seats: {seats-count}."
        Present the allocation as a table with exactly these columns in this order — do not skip any column: Connector type (connectorType), Connector name (connector), Peak usage (max-usage).`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'GUID of the subaccount to query. If omitted, the partner account is queried.'
            },
            timeRange: {
                type: 'object',
                description: 'Date range for the seat allocation query. Must use "from" and "to" keys (not "start"/"end").',
                properties: {
                    from: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Beginning of the range in ISO 8601 format (e.g. 2026-03-01T00:00:00.000Z)'
                    },
                    to: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End of the range in ISO 8601 format (e.g. 2026-03-09T23:59:59.999Z)'
                    }
                },
                required: ['from', 'to'],
                additionalProperties: false
            }
        },
        required: ['timeRange'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            total: {
                type: 'object',
                description: 'Aggregated seat usage totals',
                properties: {
                    'connectors-count': {
                        type: 'number',
                        description: 'Total number of active connectors'
                    },
                    'seats-count': {
                        type: 'number',
                        description: 'Total peak seat count across all connectors'
                    },
                    'account-type': {
                        type: 'string',
                        description: 'Account type (e.g. customer, partner)'
                    }
                },
                required: ['connectors-count', 'seats-count', 'account-type']
            },
            allocation: {
                type: 'array',
                description: 'Per-connector seat allocation. Only non-zero connector-level totals are included.',
                items: {
                    type: 'object',
                    properties: {
                        connectorType: {
                            type: 'string',
                            description: 'Connector type key (e.g. azure-ad, o365-admin, gsuite)'
                        },
                        connector: {
                            type: ['string', 'null'],
                            description: 'Human-readable connector name (e.g. Entra ID, Microsoft 365, Google Workspace), or null if not mapped'
                        },
                        'max-usage': {
                            type: 'number',
                            description: 'Peak seat usage within the requested time range'
                        }
                    },
                    required: ['connector', 'max-usage']
                }
            }
        },
        required: ['total', 'allocation']
    }
};

const PMC_GET_SUBACCOUNT_SEAT_USAGE_HISTORY_TOOL: Tool = {
    name: 'pmc_get_subaccount_seat_usage_history',
    title: 'Get subaccount seat usage history',
    description: `Get a historical timeline of seat usage snapshots for a customer subaccount within a date range.
        **Step 1 — Summary cards.** For each unique top-level resource (readableName) with non-zero usage, show a summary card: "{readableName} {firstUsage} → {lastUsage}" if usage changed, or "{readableName} {usage}" if constant. If the resource has aggregated-on sub-resources, list them as sub-bullets: "• {subReadableName}: {subUsage}" using the values from the latest snapshot.
        **Step 2 — Line chart artifact.** Render an interactive line chart. X-axis: snapshot timestamps (time). Y-axis: seat usage count. One solid line per top-level resource (readableName). For resources that have aggregated-on sub-resources, also render each sub-resource (subReadableName) as a dashed line in a lighter shade of the same color. Include a legend for all lines. Skip resources and sub-resources with zero usage across all snapshots.`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'GUID of the subaccount to query'
            },
            timeRange: {
                type: 'object',
                description: 'Date range for the usage history query. Must use "from" and "to" keys (not "start"/"end").',
                properties: {
                    from: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Beginning of the range in ISO 8601 format (e.g. 2026-03-01T00:00:00.000Z)'
                    },
                    to: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End of the range in ISO 8601 format (e.g. 2026-03-09T23:59:59.999Z)'
                    }
                },
                required: ['from', 'to'],
                additionalProperties: false
            }
        },
        required: ['customer_guid', 'timeRange'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            snapshots: {
                type: 'array',
                description: 'Ordered list of usage snapshots within the requested time range',
                items: {
                    type: 'object',
                    properties: {
                        time: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Timestamp of the snapshot'
                        },
                        resources: {
                            type: 'array',
                            description: 'Resource usage entries for this snapshot',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Resource name (e.g. m365-quadseats-full)'
                                    },
                                    readableName: {
                                        type: 'string',
                                        description: 'Human-readable resource name (e.g. M365 Full)'
                                    },
                                    usage: {
                                        type: 'number',
                                        description: 'Seat usage count at this snapshot'
                                    },
                                    seatType: {
                                        type: 'string',
                                        enum: ['full', 'light', 'faculty', 'student'],
                                        description: 'Seat type derived from the resource name'
                                    },
                                    'aggregated-on': {
                                        type: 'array',
                                        description: 'Sub-resource breakdown when this resource is an aggregated total',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string', description: 'Sub-resource name' },
                                                readableName: { type: 'string', description: 'Human-readable sub-resource name' },
                                                usage: { type: 'number', description: 'Sub-resource usage count' }
                                            },
                                            required: ['name', 'readableName', 'usage']
                                        }
                                    }
                                },
                                required: ['name', 'readableName', 'usage', 'seatType', 'aggregated-on']
                            }
                        }
                    },
                    required: ['time', 'resources']
                }
            }
        },
        required: ['snapshots']
    }
};

export const PMC_USAGE_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    pmc_get_exceeding_seat_limit: [{
        name: 'Expirations',
        options: ['put']
    }],
    pmc_get_seats_allocation: [{
        name: 'ResourcesMaximumUsage',
        options: ['put']
    }],
    pmc_get_subaccount_seat_usage_history: [{
        name: 'ResourcesHistory',
        options: ['put']
    }]
};

export const PMC_USAGE_TOOLS_DEFINITIONS = [
    PMC_GET_EXCEEDING_SEAT_LIMIT_TOOL,
    GET_SEATS_ALLOCATION_TOOL,
    PMC_GET_SUBACCOUNT_SEAT_USAGE_HISTORY_TOOL
] as const;
