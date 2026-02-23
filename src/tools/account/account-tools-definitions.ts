import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';

const GET_MY_ACCOUNT_INFO_TOOL = {
    name: 'get_my_account_info',
    description: 'Get comprehensive account information, including status, creation date, product assignment, and service details',
    inputSchema: {
        type: 'object',
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        account: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Unique identifier of the user account'
                },
                enabled: {
                    type: 'boolean',
                    description: 'Whether the account is currently active'
                },
                created: {
                    type: 'string',
                    format: 'date-time',
                    description: 'ISO 8601 timestamp when the account was created'
                },
                product: {
                    type: 'string',
                    description: 'Product GUID associated with this account'
                },
                parent: {
                    type: 'string',
                    description: 'Parent account GUID'
                },
                subscribed: {
                    type: 'boolean',
                    description: 'Whether the account is subscribed'
                }
            }
        },
        required: ['account']
    }
} as const satisfies Tool;

export const ACCOUNT_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_my_account_info: [{
        name: 'User',
        options: ['get']
    }]
};

export const ACCOUNT_TOOLS_DEFINITIONS = [
    GET_MY_ACCOUNT_INFO_TOOL
] as const;
