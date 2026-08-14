import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const SEARCH_SNAPSHOT_DATA_TOOL: Tool = {
    name: 'search_snapshot_data',
    description: 'Search items in the snapshot by search terms. \nBrief description for output schema: "_error" from "content" node represents relevance score to the "searchTerms", where 0 is exact match.',
    inputSchema: {
        additionalProperties: false,
        type: 'object',
        properties: {
            device: {
                type: 'string',
                description: 'Connector guid for searching'
            },
            snaptime: {
                type: 'string',
                format: 'date-time',
                description: 'ISO 8601 timestamp for the selected snapshot, where we want to perform search'
            },
            searchTerms: {
                type: 'string',
                description: 'Search term for the backedup item'
            },
            pathRoot: {
                type: 'string',
                description: 'Path in the connector where we start searching',
                default: '/'
            },
            count: {
                type: 'number',
                description: 'Limit search results that could be returned in scope of single request, max 1000',
                default: 50
            },
            categories: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['folder', 'video', 'image', 'audio', 'message', 'document', 'others']
                },
                description: 'Category that search item belongs too. With "message" category you filter for emails and TeamsChats messages.'
            },
            subject: {
                type: 'string',
                description: 'This parameter could be used with "message" category. This parameter is used for filter email that include value in the subject.'
            },
            from: {
                type: 'string',
                description: 'This parameter could be used with "message" category. This parameter is used for filter email or Teams Chat messages, etc. Every item where we have "sender" in meta keys.'
            },
            to: {
                type: 'string',
                description: 'This parameter could be used with "message" category. This parameter is used for filter email or Teams Chat messages, etc. Every item where we have "to" in meta keys.'
            },
            dateFrom: {
                type: 'number',
                description: 'Specify the start date in UNIX timestamp'
            },
            dateTo: {
                type: 'number',
                description: 'Specify the end date in UNIX timestamp'
            },
            mimeType: {
                type: 'string',
                description: 'MIME type of search item. "application/pdf" for PDF file'
            },
            startIndex: {
                type: 'number',
                description: 'Index from which we should start receiving items',
                default: 0
            }
        },
        required: ['device']
    },
    outputSchema: {
        additionalProperties: false,
        type: 'object',
        properties: {
            pagination: {
                type: 'object',
                required: ['hasMorePages', 'totalInResponse'],
                properties: {
                    hasMorePages: {
                        type: 'boolean',
                        description: 'Indicates if more versions are available beyond the current response'
                    },
                    nextOffset: {
                        type: 'integer',
                        description: 'Offset value to be used for fetching the next page of results'
                    },
                    totalInResponse: {
                        type: 'integer',
                        description: 'Total number of versions returned in the current response'
                    }
                }
            },
            results: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    entry: {
                        type: 'array',
                        description: 'Describe an array of items in the snapshot',
                        items: {
                            type: 'object',
                            required: ['id', 'meta', 'pathRoot', 'itemName'],
                            description: 'List of found in the snapshot items. Including name, path, fileName, time when file was created/updated, mime type, file size and other metadata',
                            additionalProperties: true,
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Unique item id. It is used to download the item as zip'
                                },
                                pathRoot: {
                                    type: 'string',
                                    description: 'Actual path root for current item in the snapshot'
                                },
                                itemName: {
                                    type: 'string',
                                    description: 'Actual item name in the snapshot, used as a reference for related tool cals'
                                },
                                name: {
                                    type: 'string',
                                    description: 'The name of the file/folder as it is on the vendor side'
                                },
                                title: {
                                    type: 'string',
                                    description: 'Humen readable name, usually refers to dname from the meta data'
                                },
                                updated: {
                                    type: 'string',
                                    description: 'The date when item was last updated (ISO 8601)'
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category of the item that describes what file type it is'
                                },
                                content: {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        _url: {
                                            type: 'string',
                                            description: 'The pathname to download the item'
                                        },
                                        _error: {
                                            type: 'string',
                                            description: 'Represent relevance score for the search terms, where 0 is exact match'
                                        }
                                    }
                                },
                                meta: {
                                    type: 'object',
                                    description: 'Detailed information of the item',
                                    additionalProperties: true,
                                    properties: {
                                        udt: {
                                            type: 'string',
                                            description: 'Unique identifier inside snapshot that reference to the item type'
                                        },
                                        size: {
                                            type: 'string',
                                            description: 'Size of the item (in bytes)'
                                        },
                                        dname: {
                                            type: 'string',
                                            description: 'Item\'s name to display'
                                        },
                                        author_name: {
                                            type: 'string',
                                            description: 'Person\'s name who is author of the item'
                                        },
                                        editor_name: {
                                            type: 'string',
                                            description: 'Person\'s name who is last editor of the item'
                                        },
                                        time_created: {
                                            type: 'string',
                                            description: 'The time when the item was created in milliseconds'
                                        },
                                        'mime-type': {
                                            type: 'string',
                                            description: 'MIME type. Indicates the nature and format of a document, file, or assortment of bytes'
                                        }
                                    },
                                    required: ['udt']
                                }
                            }
                        }
                    }
                },
                required: ['entry']
            }
        },
        required: ['results', 'pagination']
    }
};

const GET_ITEM_VERSIONS_HISTORY_TOOL = {
    name: 'get_item_versions_history',
    description: 'Get the list of all the file versions (snapshots where this file was changed) within selected date range',
    inputSchema: {
        type: 'object',
        properties: {
            device: {
                type: 'string',
                description: 'The GUID of the connector/device whose item (file or folder) versions you want to get'
            },
            snaptimeFrom: {
                type: 'string',
                description: 'Start of the time range for searching snapshots (ISO 8601). For example: 2026-05-01T10:00:00Z'
            },
            snaptimeTo: {
                type: 'string',
                description: 'End of the time range for searching snapshots (ISO 8601). For example: 2026-05-04T10:00:00Z'
            },
            pathRoot: {
                type: 'string',
                description: 'The full path to an item location. For example: /Users/{itemId}/OneDrive/Documents/Budget.xlsx'
            },
            itemName: {
                type: 'string',
                description: 'The name of the item whose versions we are looking for'
            },
            count: {
                type: 'integer',
                description: 'Number of versions/snapshots to return'
            },
            startIndex: {
                type: 'integer',
                description: 'Index to start from for fetching the next page of results. Use the nextOffset value from the previous response.'
            }
        },
        required: [
            'device',
            'snaptimeFrom',
            'pathRoot',
            'itemName'
        ]
    },
    outputSchema: {
        type: 'object',
        required: ['pagination', 'itemVersions'],
        properties: {
            pagination: {
                type: 'object',
                required: ['hasMorePages', 'totalInResponse'],
                properties: {
                    hasMorePages: {
                        type: 'boolean',
                        description: 'Indicates if more versions are available beyond the current response'
                    },
                    nextOffset: {
                        type: 'integer',
                        description: 'Offset value to be used for fetching the next page of results'
                    },
                    totalInResponse: {
                        type: 'integer',
                        description: 'Total number of versions returned in the current response'
                    }
                }
            },
            itemVersions: {
                type: 'object',
                required: ['itemsPerPage', 'startIndex', 'totalResults'],
                description: 'Comprehensive information about item versions within the specified time range including file size, author, time when file was created, mime type etc.',
                additionalProperties: true,
                properties: {
                    itemsPerPage: {
                        type: 'string',
                        description: 'Specifies the limit of items that will be returned within a single query'
                    },
                    startIndex: {
                        type: 'string',
                        description: 'Indicates the ordinal number of the element from which the response starts'
                    },
                    totalResults: {
                        type: 'string',
                        description: 'How many snapshots were found in a given date range'
                    },
                    entry: {
                        type: 'array',
                        description: 'List of snapshots within the specified time range',
                        items: {
                            type: 'object',
                            required: ['id', 'name', 'title', 'updated', 'category', 'meta'],
                            additionalProperties: false,
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Unique item id. It is used to download the item as zip'
                                },
                                name: {
                                    type: 'string',
                                    description: 'The name of the file/folder with file extension'
                                },
                                title: {
                                    type: 'string',
                                    description: 'The name of the file/folder with file extension'
                                },
                                updated: {
                                    type: 'string',
                                    description: 'The date of the snapshot the last changes to the item were detected (ISO 8601)'
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category of the item that describes what file type it is'
                                },
                                content: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        _url: {
                                            type: 'string',
                                            description: 'The pathname to download the item'
                                        }
                                    }
                                },
                                meta: {
                                    type: 'object',
                                    description: 'Detailed information of the item',
                                    additionalProperties: false,
                                    properties: {
                                        size: {
                                            type: 'string',
                                            description: 'Size of the item (in bytes)'
                                        },
                                        dname: {
                                            type: 'string',
                                            description: 'Item\'s name to display'
                                        },
                                        author_name: {
                                            type: 'string',
                                            description: 'Person\'s name who is author of the item'
                                        },
                                        editor_name: {
                                            type: 'string',
                                            description: 'Person\'s name who is last editor of the item'
                                        },
                                        time_created: {
                                            type: 'string',
                                            description: 'The time when the item was created in milliseconds'
                                        },
                                        udt: {
                                            type: 'string',
                                            description: 'Unique identifier of the item type'
                                        },
                                        mtimes: {
                                            type: 'string',
                                            description: 'The time when the item was actually changed, in milliseconds'
                                        },
                                        'mime-type': {
                                            type: 'string',
                                            description: 'MIME type. Indicates the nature and format of a document, file, or assortment of bytes'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
} as const satisfies Tool;

export const BROWSING_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    search_snapshot_data: [{
        name: 'BSearch',
        options: ['get']
    }],
    get_item_versions_history: [{
        name: 'BSearch',
        options: ['get']
    }]
};

export const BROWSING_TOOLS_DEFINITIONS = [
    SEARCH_SNAPSHOT_DATA_TOOL,
    GET_ITEM_VERSIONS_HISTORY_TOOL
] as const;
