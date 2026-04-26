import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { IToolRequiredAcl } from '../../helpers/acl.helper.js';

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
        description: 'Scope for account-aware lookups. Use "account" for one specific account, "children" for direct child accounts, "leaf" for descendant leaf accounts, "managed" for MSP-managed leaf accounts, or "all" for the root account plus direct child accounts.'
    }
} as const;

const GENERIC_OBJECT: object = { type: 'object' };
const GENERIC_ARRAY: object = { type: 'array', items: { type: 'object' } };

const simpleTool = (
    name: string,
    description: string,
    properties: Record<string, object> = {},
    required: string[] = [],
    outputProperties: Record<string, object> = {}
): Tool => ({
    name,
    description,
    inputSchema: {
        type: 'object',
        properties,
        required,
        additionalProperties: false
    },
    outputSchema: {
        type: 'object',
        properties: outputProperties,
        additionalProperties: true
    }
});

export const ACCOUNT_TOOLS_DEFINITIONS = [
    simpleTool('get_account_info', 'Get a compact summary for one account. Best for a quick tenant/client overview before drilling into MFA, SSO, usage, or connectors.', { ...ACCOUNT_ID_PROPERTY }, [], { account: GENERIC_OBJECT }),
    simpleTool('get_account_contact_info', 'Get the authoritative primary contact details for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { account_id: { type: 'string' }, primary_contact: GENERIC_OBJECT, mfa: GENERIC_OBJECT }),
    simpleTool('get_account_mfa_status', 'Get account-level MFA status and configured MFA factors for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { account_id: { type: 'string' }, mfa: GENERIC_OBJECT }),
    simpleTool('get_account_sso_status', 'Get account-level SSO status and SSO configuration details for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { account_id: { type: 'string' }, sso: GENERIC_OBJECT }),
    simpleTool('get_account_usage_summary', 'Get a period-based usage summary for one account. Use this for historical usage over a date range.', {
        ...ACCOUNT_ID_PROPERTY,
        from_date: { type: 'string' },
        to_date: { type: 'string' }
    }, [], {}),
    simpleTool('get_account_current_usage', 'Get current usage for one account. Use this for the latest point-in-time usage snapshot.', { ...ACCOUNT_ID_PROPERTY }, [], {}),
    simpleTool('get_account_resource_usage', 'Get per-resource usage details for one account.', {
        ...ACCOUNT_ID_PROPERTY,
        include_zero_usage: { type: 'boolean' }
    }, [], {}),
    simpleTool('get_user_mfa_status', 'Get per-user MFA status for a specific user.', {
        ...ACCOUNT_ID_PROPERTY,
        username: { type: 'string' }
    }, ['username'], { account_id: { type: 'string' }, username: { type: 'string' }, mfa: GENERIC_OBJECT }),
    simpleTool('list_account_users', 'List user principals associated with one account.', { ...ACCOUNT_ID_PROPERTY }, [], { account_id: { type: 'string' }, users: GENERIC_ARRAY }),
    simpleTool('list_account_tokens', 'List secondary account tokens for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { account_id: { type: 'string' }, tokens: GENERIC_ARRAY }),
    simpleTool('list_accounts', 'List accounts in scope. Use this to discover valid account IDs before calling more specific account or MSP tools.', { ...ACCOUNT_ID_PROPERTY, ...SCOPE_PROPERTY }, [], { accounts: GENERIC_ARRAY }),
    simpleTool('list_sub_accounts', 'List direct sub-accounts for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { accounts: GENERIC_ARRAY }),
    simpleTool('find_account', 'Find accounts by partial name, external ID, or account ID within the requested scope.', {
        query: { type: 'string' },
        ...ACCOUNT_ID_PROPERTY,
        ...SCOPE_PROPERTY
    }, ['query'], { accounts: GENERIC_ARRAY }),
    simpleTool('get_account_summary', 'Get a richer single-account summary including connectors and recent audit events. Use this when a quick overview is not enough.', {
        ...ACCOUNT_ID_PROPERTY,
        audit_duration: { type: 'string' }
    }, [], { account: GENERIC_OBJECT, unhealthy_connectors: GENERIC_ARRAY, recent_audit_events: GENERIC_ARRAY }),
    simpleTool('get_account_security_summary', 'Get a focused single-account security summary covering areas such as MFA, SSO, and related posture indicators.', { ...ACCOUNT_ID_PROPERTY }, [], { summary: GENERIC_OBJECT }),
    simpleTool('get_account_token_summary', 'Get a focused summary of secondary tokens for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { summary: GENERIC_OBJECT, tokens: GENERIC_ARRAY }),
    simpleTool('get_account_connector_summary', 'Get a focused summary of connectors for one account.', { ...ACCOUNT_ID_PROPERTY }, [], { summary: GENERIC_OBJECT, workloads: GENERIC_ARRAY, connectors: GENERIC_ARRAY }),
    simpleTool('get_msp_overview', 'Get a high-level overview across all accounts in the requested scope. Use this for broad MSP rollups, not single-account detail.', { ...ACCOUNT_ID_PROPERTY, ...SCOPE_PROPERTY }, [], { totals: GENERIC_OBJECT, accounts: GENERIC_ARRAY }),
    simpleTool('get_msp_security_overview', 'Get a high-level security overview across all accounts in the requested scope.', { ...ACCOUNT_ID_PROPERTY, ...SCOPE_PROPERTY }, [], { summary: GENERIC_OBJECT, accounts: GENERIC_ARRAY }),
    simpleTool('get_msp_usage_overview', 'Get a period-based MSP usage overview across all accounts in the requested scope.', {
        ...ACCOUNT_ID_PROPERTY,
        ...SCOPE_PROPERTY,
        from_date: { type: 'string' },
        to_date: { type: 'string' }
    }, [], { summary: GENERIC_OBJECT, accounts: GENERIC_ARRAY, workloads: GENERIC_ARRAY }),
    simpleTool('get_msp_current_usage_overview', 'Get a current MSP usage overview across all accounts in the requested scope.', { ...ACCOUNT_ID_PROPERTY, ...SCOPE_PROPERTY }, [], { summary: GENERIC_OBJECT, accounts: GENERIC_ARRAY, workloads: GENERIC_ARRAY }),
    simpleTool('get_msp_workload_usage_summary', 'Get a period-based MSP workload usage summary across all accounts in the requested scope.', {
        ...ACCOUNT_ID_PROPERTY,
        ...SCOPE_PROPERTY,
        from_date: { type: 'string' },
        to_date: { type: 'string' },
        workload_type: { type: 'string' }
    }, [], { summary: GENERIC_OBJECT, accounts: GENERIC_ARRAY, workloads: GENERIC_ARRAY }),
    simpleTool('get_msp_current_workload_usage_summary', 'Get a current MSP workload usage summary across all accounts in the requested scope.', {
        ...ACCOUNT_ID_PROPERTY,
        ...SCOPE_PROPERTY,
        workload_type: { type: 'string' }
    }, [], { summary: GENERIC_OBJECT, accounts: GENERIC_ARRAY, workloads: GENERIC_ARRAY }),
    simpleTool('get_msp_connector_summary', 'Get a focused MSP connector summary across all accounts in the requested scope.', { ...ACCOUNT_ID_PROPERTY, ...SCOPE_PROPERTY }, [], { summary: GENERIC_OBJECT, workloads: GENERIC_ARRAY, connectors: GENERIC_ARRAY })
] as const;

export const ACCOUNT_TOOLS_REQUIRED_ACL: IToolRequiredAcl = {
    get_account_info: [{ name: 'User', options: ['get'] }],
    get_account_contact_info: [{ name: 'Tokens', options: ['get'] }, { name: 'User', options: ['get'] }],
    get_account_mfa_status: [{ name: 'User', options: ['get'] }],
    get_account_sso_status: [{ name: 'User', options: ['get'] }, { name: 'SsoConfigs', options: ['get'] }],
    get_account_usage_summary: [{ name: 'ResourcesUsage', options: ['get', 'put'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }],
    get_account_current_usage: [{ name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }],
    get_account_resource_usage: [{ name: 'Resources', options: ['get'] }],
    get_user_mfa_status: [{ name: 'User', options: ['get'] }],
    list_account_users: [{ name: 'Tokens', options: ['get'] }, { name: 'User', options: ['get'] }],
    list_account_tokens: [{ name: 'Tokens', options: ['get'] }],
    list_accounts: [{ name: 'User', options: ['get'] }],
    list_sub_accounts: [{ name: 'User', options: ['get'] }],
    find_account: [{ name: 'User', options: ['get'] }],
    get_account_summary: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }, { name: 'DevHealth', options: ['get'] }, { name: 'AuditFilter', options: ['put'] }],
    get_account_security_summary: [{ name: 'User', options: ['get'] }, { name: 'Tokens', options: ['get'] }, { name: 'SsoConfigs', options: ['get'] }],
    get_account_token_summary: [{ name: 'User', options: ['get'] }, { name: 'Tokens', options: ['get'] }],
    get_account_connector_summary: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'DevHealth', options: ['get'] }],
    get_msp_overview: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'DevHealth', options: ['get'] }],
    get_msp_security_overview: [{ name: 'User', options: ['get'] }, { name: 'Tokens', options: ['get'] }, { name: 'SsoConfigs', options: ['get'] }],
    get_msp_usage_overview: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }, { name: 'ResourcesUsage', options: ['get', 'put'] }],
    get_msp_current_usage_overview: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }],
    get_msp_workload_usage_summary: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }, { name: 'ResourcesUsage', options: ['get', 'put'] }],
    get_msp_current_workload_usage_summary: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'Resources', options: ['get'] }],
    get_msp_connector_summary: [{ name: 'User', options: ['get'] }, { name: 'Devices', options: ['get'] }, { name: 'DevHealth', options: ['get'] }]
};
