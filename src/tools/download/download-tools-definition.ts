import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const GET_DOWNLOAD_ITEM_URL_TOOL = {
    name: 'get_download_item_url',
    description: 'Get the valid url to download item',
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'The pathname to download item. For example: /download/itemName'
            }
        },
        required: ['url']
    },
    outputSchema: {
        type: 'object',
        required: ['downloadUrl'],
        properties: {
            downloadUrl: {
                type: 'string',
                description: 'A valid url to download item'
            }
        }
    }
} as const satisfies Tool;

const GET_DOWNLOAD_ZIP_URL_TOOL = {
    name: 'get_download_zip_url',
    description: 'Get the valid url to download several items as zip archive',
    inputSchema: {
        type: 'object',
        properties: {
            deviceId: {
                type: 'string',
                description: 'GUID of the connector/device whose items you want to download'
            },
            tstamp: {
                type: 'string',
                description: 'ISO 8601 timestamp when the snapshot was created'
            },
            id: {
                type: 'array',
                items: {
                    type: 'string',
                    description: 'Unique item id'
                }
            }
        },
        required: ['deviceId', 'tstamp', 'id']
    },
    outputSchema: {
        type: 'object',
        required: ['downloadUrl'],
        properties: {
            downloadUrl: {
                type: 'string',
                description: 'A valid url to download zip archive'
            }
        }
    }
} as const satisfies Tool;

export const DOWNLOAD_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_download_item_url: [{
        name: 'DownFile',
        options: ['get']
    }],
    get_download_zip_url: [{
        name: 'DownFile',
        options: ['post']
    }]
};

export const DOWNLOAD_TOOLS_DEFINITIONS = [
    GET_DOWNLOAD_ITEM_URL_TOOL,
    GET_DOWNLOAD_ZIP_URL_TOOL
];
