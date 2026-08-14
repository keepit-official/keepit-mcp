import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import { CONNECTOR_TYPES } from '../connector/connectors-tools-definitions.js';

const GET_DEVICE_COVERAGE_HISTORY_TOOL: Tool = {
    name: 'get_backup_coverage_history',
    description: 'Get the specific connector snapshot coverage history for a set period of time',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the target connector'
            },
            from: {
                type: 'string',
                description: 'ISO 8601 timestamp to start the query from. Default value is current timestamp minus 1 day.'
            },
            to: {
                type: 'string',
                description: 'ISO 8601 timestamp to mark the end date for the query. Default value is current timestamp (now).'
            },
            samples: {
                type: 'number',
                description: 'Number of samples (snapshots) to take starting from the newest one. By default takes all the samples in the requested time span.'
            },
            left_margin: {
                type: 'number',
                description: 'Number of samples (snapshots) to add to each diagram BEFORE set period.',
                default: 0
            },
            right_margin: {
                type: 'number',
                description: 'Number of samples (snapshots) to add to each diagram AFTER set period.',
                default: 0
            },
            raw: {
                type: 'boolean',
                description: 'If true then returns diagrams for both complete and partial snapshots. Otherwise returns diagrams data only for complete snapshots.',
                default: false
            },
            force_margins: {
                type: 'boolean',
                description: 'If true indicates that we need to get left_margin and right_margin even if we do not have any samples (snapshots) in the requested (from; to] time span.',
                default: false
            }
        },
        required: ['guid']
    },
    outputSchema: {
        type: 'object',
        description: 'Root object that contains all the information for the diagram.',
        properties: {
            diagrams: {
                type: 'array',
                description: 'Contains array of graphs. For backup coverage history only one graph is expected.',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name of the graph.'
                        },
                        axes: {
                            type: 'array',
                            description: 'List of all axes for the graph.',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Unique name of the axis.'
                                    },
                                    caption: {
                                        type: 'string',
                                        description: 'Caption that describes the axis.'
                                    },
                                    unit: {
                                        type: 'string',
                                        description: 'Name of the unit used for the axis. Ex. timestamp or byte. If absent - the value is numeric.'
                                    }
                                },
                                required: ['name', 'caption']
                            }
                        },
                        datasets: {
                            type: 'array',
                            description: 'List of datasets for a single graph.',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Name of the dataset'
                                    },
                                    axes: {
                                        type: 'array',
                                        description: 'Array of axes used in the current dataset. Order matters and matched the order of values for "points" property.',
                                        items: { type: 'string' }
                                    },
                                    points: {
                                        type: 'array',
                                        description: 'Points for the graph each containing the data for axes.',
                                        items: {
                                            type: 'array',
                                            items: {
                                                type: 'array',
                                                description: 'Array of point values. Order matches the order of corresponding dataset axes.'
                                            }
                                        }
                                    }
                                },
                                required: ['name', 'points']
                            }
                        }
                    },
                    required: ['name', 'axes', 'datasets']
                }
            }
        },
        required: ['diagrams']
    }
};

const GET_AGGREGATED_COVERAGE_HISTORY_TOOL: Tool = {
    name: 'get_aggregated_backup_coverage_history',
    description: 'Get aggregated backup coverage history of defined connector (device) type for a set period of time for all connectors. Aggregated means that we should get backup coverage history for all connectors of defined device type. Use this tool to get summarized (aggregated) info for all devices of the same type.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Type of connectors whose aggregated snapshot coverage history you want',
                enum: [...CONNECTOR_TYPES]
            },
            from: {
                type: 'string',
                description: 'ISO 8601 timestamp to start the query from. Default value is current timestamp minus 1 day.'
            },
            to: {
                type: 'string',
                description: 'ISO 8601 timestamp to mark the end date for the query. Default value is current timestamp (now).'
            },
            samples: {
                type: 'number',
                description: 'Number of samples (snapshots) to take starting from the newest one. By default takes all the samples in the requested time span.'
            },
            left_margin: {
                type: 'number',
                description: 'Number of samples (snapshots) to add to each diagram BEFORE set period.',
                default: 0
            },
            right_margin: {
                type: 'number',
                description: 'Number of samples (snapshots) to add to each diagram AFTER set period.',
                default: 0
            },
            raw: {
                type: 'boolean',
                description: 'If true then returns diagrams for both complete and partial snapshots. Otherwise returns diagrams data only for complete snapshots.',
                default: true
            },
            force_margins: {
                type: 'boolean',
                description: 'If true indicates that we need to get left_margin and right_margin even if we do not have any samples (snapshots) in the requested (from; to] time span.',
                default: false
            }
        },
        required: ['type']
    },
    outputSchema: {
        type: 'object',
        description: 'Root object that contains all the information for the diagram.',
        properties: {
            diagrams: {
                type: 'array',
                description: 'Contains array of graphs. For aggregated backup coverage history only one graph is expected.',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name of the graph.'
                        },
                        axes: {
                            type: 'array',
                            description: 'List of all axes for the graph.',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Unique name of the axis.'
                                    },
                                    caption: {
                                        type: 'string',
                                        description: 'Caption that describes the axis.'
                                    },
                                    unit: {
                                        type: 'string',
                                        description: 'Name of the unit used for the axis. Ex. timestamp or byte. If absent - the value is numeric.'
                                    }
                                },
                                required: ['name', 'caption']
                            }
                        },
                        datasets: {
                            type: 'array',
                            description: 'List of datasets for a single graph.',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Name of the dataset'
                                    },
                                    axes: {
                                        type: 'array',
                                        description: 'Array of axes used in the current dataset. Order matters and matched the order of values for "points" property.',
                                        items: { type: 'string' }
                                    },
                                    points: {
                                        type: 'array',
                                        description: 'Points for the graph each containing the data for axes.',
                                        items: {
                                            type: 'array',
                                            items: {
                                                type: 'array',
                                                description: 'Array of point values. Order matches the order of corresponding dataset axes.'
                                            }
                                        }
                                    }
                                },
                                required: ['name', 'points']
                            }
                        }
                    },
                    required: ['name', 'axes', 'datasets']
                }
            }
        },
        required: ['diagrams']
    }
};

const GET_DEVICE_BACKUP_SUMMARY_TOOL: Tool = {
    name: 'get_backup_summary',
    description: 'Get backup summary data for the specific connector including the difference in size between the two latest snapshots and the complete/partial snapshot timestamps, ONBOARDING. If you need more detailed information about latest snapshot, use the get_latest_snapshot tool. Use this tool to check if single connector is ONBOARDING. If request failed with 404 or there is no indexed snapshot, then the corresponding connector is onboarding, because there are no indexed snapshots for this connector.',
    inputSchema: {
        type: 'object',
        properties: {
            guid: {
                type: 'string',
                description: 'GUID of the target connector'
            },
            raw: {
                type: 'boolean',
                description: 'If true then returns summary for all snapshots. Otherwise returns summary only for complete snapshots.',
                default: true
            }
        },
        required: ['guid']
    },
    outputSchema: {
        type: 'object',
        description: 'Root object that contains all the information for the backup summary.',
        properties: {
            'last-snapshot-time': {
                type: 'string',
                description: 'Timestamp of last indexed snapshot'
            },
            'last-complete-snapshot-time': {
                type: 'string',
                description: 'Timestamp of last indexed complete snapshot. If this property is absent - connector is still ONBOARDING.'
            },
            'last-snapshot-size': {
                type: 'string',
                description: 'Total size of last indexed snapshot in bytes'
            },
            'size-change': {
                type: 'string',
                description: 'The change of last indexed snapshot in bytes which is the difference between added files size and deleted files size and may be negative.'
            }
        },
        required: ['last-snapshot-time', 'last-snapshot-size', 'size-change']
    }
};

const GET_AGGREGATED_DEVICE_BACKUP_SUMMARY_TOOL: Tool = {
    name: 'get_aggregated_backup_summary',
    description: 'Retrieve aggregated backup summary data across all connectors. Scope results to a specific connector type using the type parameter, ONBOARDING; omit it to get backup summary data for all connector types combined. Use this tool to check if all connectors or connectors of selected type are ONBOARDING. If there is no data or there is no indexed snapshot for some connectors, then these connectors are onboarding',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Connector type to filter aggregated backup summary data. Omit to include backup summary data for all connector types.',
                enum: [...CONNECTOR_TYPES]
            },
            raw: {
                type: 'boolean',
                description: 'If true then returns summary for all snapshots. Otherwise returns summary only for complete snapshots.',
                default: true
            }
        },
        required: []
    },
    outputSchema: {
        type: 'object',
        description: 'Root object that contains all the information for the backup summary.',
        properties: {
            'backup-summary': {
                type: 'array',
                description: 'Contains array backup summary details. If empty - all connectors are in ONBOARDING state.',
                items: {
                    type: 'object',
                    properties: {
                        guid: {
                            type: 'string',
                            description: 'GUID of the target connector'
                        },
                        'last-snapshot-time': {
                            type: 'string',
                            description: 'Timestamp of last indexed snapshot'
                        },
                        'last-complete-snapshot-time': {
                            type: 'string',
                            description: 'Timestamp of last indexed complete snapshot. If this property is absent - connector is still ONBOARDING.'
                        },
                        'last-snapshot-size': {
                            type: 'string',
                            description: 'Total size of last indexed snapshot in bytes'
                        },
                        'size-change': {
                            type: 'string',
                            description: 'The change of last indexed snapshot in bytes which is the difference between added files size and deleted files size and may be negative.'
                        }
                    },
                    required: ['guid', 'last-snapshot-time', 'last-snapshot-size', 'size-change']
                }
            }
        },
        required: ['backup-summary']
    }
};

export const MONITORING_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_backup_coverage_history: [
        {
            name: 'DevSnapshotCoverage',
            options: ['get']
        }
    ],
    get_aggregated_backup_coverage_history: [
        {
            name: 'DevSnapshotCoverage',
            options: ['get']
        }
    ],
    get_backup_summary: [
        {
            name: 'History',
            options: ['get']
        }
    ],
    get_aggregated_backup_summary: [
        {
            name: 'History',
            options: ['get']
        }
    ]
};

export const MONITORING_TOOLS_DEFINITIONS = [
    GET_DEVICE_COVERAGE_HISTORY_TOOL,
    GET_AGGREGATED_COVERAGE_HISTORY_TOOL,
    GET_DEVICE_BACKUP_SUMMARY_TOOL,
    GET_AGGREGATED_DEVICE_BACKUP_SUMMARY_TOOL
];
