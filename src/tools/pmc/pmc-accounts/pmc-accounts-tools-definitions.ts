import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../../helpers/acl.helper.js';

const PMC_GET_MY_ACCOUNT_INFO_TOOL: Tool = {
    name: 'pmc_get_my_account_info',
    title: 'Get my account info',
    description: `Returns details about the current partner account, including contact information and the list of users with access.
Present the result in two sections:
Account details — show as a key-value list with these fields in order: Account ID (id), Created (created), Product name (product.name), Product ID (product.id), Company (contact.companyname), Contact name (contact.fullname), Email (contact.email).
Users — show as a table with columns in this order: Name (descr), Email (aname), Role (acl).`,
    inputSchema: {
        type: 'object',
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            account: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Unique identifier of the Partner account'
                    },
                    created: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the account was created'
                    },
                    product: {
                        type: 'object',
                        description: 'Product assigned to this account',
                        properties: {
                            id: { type: 'string', description: 'Product ID' },
                            name: { type: 'string', description: 'Product name' }
                        },
                        required: ['id', 'name']
                    },
                    contact: {
                        type: 'object',
                        description: 'Contact information of my Partner account',
                        properties: {
                            email: { type: 'string', description: 'Contact email address' },
                            companyname: { type: 'string', description: 'Company name' },
                            fullname: { type: 'string', description: 'Full name of the contact person' }
                        },
                        required: ['email', 'companyname', 'fullname']
                    },
                    tokens: {
                        type: 'array',
                        description: 'Users with access to this account. Display as a table with columns: Name (descr), Email (aname), Role (acl).',
                        items: {
                            type: 'object',
                            properties: {
                                descr: { type: 'string', description: "User's display name" },
                                aname: { type: 'string', description: "User's login email address" },
                                acl: { type: 'string', description: "User's role or permission level" }
                            },
                            required: ['descr', 'aname', 'acl']
                        }
                    }
                },
                required: ['id', 'product', 'contact', 'tokens']
            }
        },
        required: ['account']
    }
};

const PMC_GET_SUBACCOUNT_LIST_TOOL: Tool = {
    name: 'pmc_get_subaccount_list',
    title: 'Get subaccount list',
    description: `Returns a list of all customer accounts managed by this partner.

Start the response with the total count: "{subaccountCount} subaccounts found."

Present the subaccounts as a table with columns in this order: Account ID (id), Company (contact.companyname), Contact name (contact.fullname), Email (contact.email), Created (created).`,
    inputSchema: {
        type: 'object',
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            subaccountCount: {
                type: 'number',
                description: 'Total number of accounts managed by this partner'
            },
            subaccounts: {
                type: 'array',
                description: 'List of subaccounts managed by this Partner',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Account ID' },
                        created: { type: 'string', format: 'date-time', description: 'Account creation date' },
                        contact: {
                            type: 'object',
                            description: 'Contact information of the subaccount',
                            properties: {
                                email: { type: 'string', description: 'Contact email address' },
                                companyname: { type: 'string', description: 'Company name' },
                                fullname: { type: 'string', description: 'Full name of the contact person' }
                            },
                            required: ['email', 'companyname', 'fullname']
                        }
                    },
                    required: ['id', 'created', 'contact']
                }
            }
        },
        required: ['subaccountCount', 'subaccounts']
    }
};

const PMC_GET_SUBACCOUNT_INFO_TOOL: Tool = {
    name: 'pmc_get_subaccount_info',
    title: 'Get subaccount info',
    description: `Returns full details about a specific customer account, including contact information, users with access, and the cloud services available for backup.

Present the result in three sections:

Account details — show as a key-value list with these fields in order: Account ID (id), Created (created), Product (product.name), Product ID (product.id), Company (contact.companyname), Contact name (contact.fullname), Email (contact.email).

Available workloads — list the values from available_workloads as a comma-separated line. Show "None configured" if the list is empty.

Users — show as a table with columns in this order: Name (descr), Email (aname), Role (acl).`,
    inputSchema: {
        type: 'object',
        properties: {
            customer_guid: {
                type: 'string',
                description: 'Unique ID of the customer account to look up'
            }
        },
        required: ['customer_guid'],
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: {
            account: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Unique identifier of the subaccount'
                    },
                    created: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 timestamp when the account was created'
                    },
                    product: {
                        type: 'object',
                        description: 'Product assigned to this account',
                        properties: {
                            id: { type: 'string', description: 'Product ID' },
                            name: { type: 'string', description: 'Product name' }
                        },
                        required: ['id', 'name']
                    },
                    contact: {
                        type: 'object',
                        description: 'Contact information of the subaccount',
                        properties: {
                            email: { type: 'string', description: 'Contact email address' },
                            companyname: { type: 'string', description: 'Company name' },
                            fullname: { type: 'string', description: 'Full name of the contact person' }
                        }
                    },
                    tokens: {
                        type: 'array',
                        description: 'Users with access to this account. Display as a table with columns: Name (descr), Email (aname), Role (acl).',
                        items: {
                            type: 'object',
                            properties: {
                                descr: { type: 'string', description: "User's display name" },
                                aname: { type: 'string', description: "User's login email address" },
                                acl: { type: 'string', description: "User's role or permission level" }
                            },
                            required: ['descr', 'aname', 'acl']
                        }
                    },
                    available_workloads: {
                        type: 'array',
                        description: 'Cloud services available for backup on this account (e.g. Microsoft 365, Google Workspace)',
                        items: { type: 'string' }
                    }
                },
                required: ['id', 'created', 'product', 'contact', 'tokens', 'available_workloads']
            }
        },
        required: ['account']
    }
};

export const PMC_ACCOUNTS_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    pmc_get_my_account_info: [
        { name: 'User', options: ['get'] },
        { name: 'UserProduct', options: ['get'] },
        { name: 'Contacts', options: ['get'] },
        { name: 'Tokens', options: ['get'] }
    ],
    pmc_get_subaccount_list: [
        { name: 'SubUsers', options: ['get'] }
    ],
    pmc_get_subaccount_info: [
        { name: 'User', options: ['get'] },
        { name: 'UserProduct', options: ['get'] },
        { name: 'Contacts', options: ['get'] },
        { name: 'Tokens', options: ['get'] },
        { name: 'Resources', options: ['get'] },
        { name: 'Portfolio', options: ['get'] }
    ]
};

export const PMC_ACCOUNTS_TOOLS_DEFINITIONS = [
    PMC_GET_MY_ACCOUNT_INFO_TOOL,
    PMC_GET_SUBACCOUNT_LIST_TOOL,
    PMC_GET_SUBACCOUNT_INFO_TOOL
] as const;
