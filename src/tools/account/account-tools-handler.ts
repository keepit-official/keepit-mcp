import {
    findAccount,
    getAccountConnectorSummary,
    getAccountContactInfo,
    getAccountCurrentUsage,
    getAccountInfo,
    getAccountMfaInfo,
    getAccountResourceUsage,
    getAccountSecuritySummary,
    getAccountSsoInfo,
    getAccountSummary,
    getAccountTokenSummary,
    getAccountUsageSummary,
    getMspConnectorSummary,
    getMspCurrentUsageOverview,
    getMspCurrentWorkloadUsageSummary,
    getMspOverview,
    getMspSecurityOverview,
    getMspUsageOverview,
    getMspWorkloadUsageSummary,
    getUserMfaInfo,
    listAccountTokens,
    listAccountUsers,
    listAccounts,
    listSubAccounts
} from './account-tools.helper.js';
import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';

type TWithMetaPayload = {
    success: boolean;
    messages?: string[];
    meta?: Record<string, unknown>;
};

const withMeta = (
    tool: string,
    payload: TWithMetaPayload,
    body: unknown
) => createToolResponse(body as Record<string, unknown>, {
    tool,
    success: payload.success,
    messages: payload.messages,
    ...payload.meta
});

// The MCP SDK validates tool inputs against the registered input schema before invoking handlers,
// so the `as string | undefined` casts on request.params.arguments fields are safe for
// schema-declared optional string parameters.
export const ACCOUNT_TOOLS_HANDLER: ToolHandlers = {
    get_account_info: async (request, authConfig) => {
        try {
            const payload = await getAccountInfo(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_info', payload, { account: payload.result });
        } catch (error) {
            return createToolErrorResponse('get_account_info', error);
        }
    },
    get_account_contact_info: async (request, authConfig) => {
        try {
            const payload = await getAccountContactInfo(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_contact_info', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_contact_info', error);
        }
    },
    get_account_mfa_status: async (request, authConfig) => {
        try {
            const payload = await getAccountMfaInfo(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_mfa_status', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_mfa_status', error);
        }
    },
    get_account_sso_status: async (request, authConfig) => {
        try {
            const payload = await getAccountSsoInfo(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_sso_status', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_sso_status', error);
        }
    },
    get_account_usage_summary: async (request, authConfig) => {
        try {
            const payload = await getAccountUsageSummary(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                fromDate: request.params.arguments?.from_date as string | undefined,
                toDate: request.params.arguments?.to_date as string | undefined
            });
            return withMeta('get_account_usage_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_usage_summary', error);
        }
    },
    get_account_current_usage: async (request, authConfig) => {
        try {
            const payload = await getAccountCurrentUsage(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_current_usage', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_current_usage', error);
        }
    },
    get_account_resource_usage: async (request, authConfig) => {
        try {
            const payload = await getAccountResourceUsage(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                includeZeroUsage: request.params.arguments?.include_zero_usage as boolean | undefined
            });
            return withMeta('get_account_resource_usage', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_resource_usage', error);
        }
    },
    get_user_mfa_status: async (request, authConfig) => {
        try {
            const payload = await getUserMfaInfo(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                username: request.params.arguments?.username as string | undefined
            });
            return withMeta('get_user_mfa_status', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_user_mfa_status', error);
        }
    },
    list_account_users: async (request, authConfig) => {
        try {
            const payload = await listAccountUsers(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('list_account_users', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('list_account_users', error);
        }
    },
    list_account_tokens: async (request, authConfig) => {
        try {
            const payload = await listAccountTokens(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('list_account_tokens', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('list_account_tokens', error);
        }
    },
    list_accounts: async (request, authConfig) => {
        try {
            const payload = await listAccounts(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('list_accounts', payload, { accounts: payload.result });
        } catch (error) {
            return createToolErrorResponse('list_accounts', error);
        }
    },
    list_sub_accounts: async (request, authConfig) => {
        try {
            const payload = await listSubAccounts(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('list_sub_accounts', payload, { accounts: payload.result });
        } catch (error) {
            return createToolErrorResponse('list_sub_accounts', error);
        }
    },
    find_account: async (request, authConfig) => {
        try {
            const payload = await findAccount(authConfig, {
                query: request.params.arguments?.query as string,
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('find_account', payload, { accounts: payload.result });
        } catch (error) {
            return createToolErrorResponse('find_account', error);
        }
    },
    get_account_summary: async (request, authConfig) => {
        try {
            const payload = await getAccountSummary(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                auditDuration: request.params.arguments?.audit_duration as string | undefined
            });
            return withMeta('get_account_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_summary', error);
        }
    },
    get_account_security_summary: async (request, authConfig) => {
        try {
            const payload = await getAccountSecuritySummary(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_security_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_security_summary', error);
        }
    },
    get_account_token_summary: async (request, authConfig) => {
        try {
            const payload = await getAccountTokenSummary(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_token_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_token_summary', error);
        }
    },
    get_account_connector_summary: async (request, authConfig) => {
        try {
            const payload = await getAccountConnectorSummary(authConfig, request.params.arguments?.account_id as string | undefined);
            return withMeta('get_account_connector_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_account_connector_summary', error);
        }
    },
    get_msp_overview: async (request, authConfig) => {
        try {
            const payload = await getMspOverview(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('get_msp_overview', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_overview', error);
        }
    },
    get_msp_security_overview: async (request, authConfig) => {
        try {
            const payload = await getMspSecurityOverview(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('get_msp_security_overview', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_security_overview', error);
        }
    },
    get_msp_usage_overview: async (request, authConfig) => {
        try {
            const payload = await getMspUsageOverview(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined,
                fromDate: request.params.arguments?.from_date as string | undefined,
                toDate: request.params.arguments?.to_date as string | undefined
            });
            return withMeta('get_msp_usage_overview', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_usage_overview', error);
        }
    },
    get_msp_current_usage_overview: async (request, authConfig) => {
        try {
            const payload = await getMspCurrentUsageOverview(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('get_msp_current_usage_overview', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_current_usage_overview', error);
        }
    },
    get_msp_workload_usage_summary: async (request, authConfig) => {
        try {
            const payload = await getMspWorkloadUsageSummary(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined,
                fromDate: request.params.arguments?.from_date as string | undefined,
                toDate: request.params.arguments?.to_date as string | undefined,
                workloadType: request.params.arguments?.workload_type as string | undefined
            });
            return withMeta('get_msp_workload_usage_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_workload_usage_summary', error);
        }
    },
    get_msp_current_workload_usage_summary: async (request, authConfig) => {
        try {
            const payload = await getMspCurrentWorkloadUsageSummary(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined,
                workloadType: request.params.arguments?.workload_type as string | undefined
            });
            return withMeta('get_msp_current_workload_usage_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_current_workload_usage_summary', error);
        }
    },
    get_msp_connector_summary: async (request, authConfig) => {
        try {
            const payload = await getMspConnectorSummary(authConfig, {
                accountId: request.params.arguments?.account_id as string | undefined,
                scope: request.params.arguments?.scope as string | undefined
            });
            return withMeta('get_msp_connector_summary', payload, payload.result);
        } catch (error) {
            return createToolErrorResponse('get_msp_connector_summary', error);
        }
    }
};
