/**
 * MSP fan-out aggregation helpers.
 *
 * Each exported function resolves a set of accounts via getAccountsForScope,
 * then fans out to the corresponding single-account helper using mapWithConcurrency,
 * and aggregates the per-account results into a single MSP-level summary.
 */
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import {
    buildScopeMeta,
    createRequestCache,
    getAccountsForScope,
    mapWithConcurrency
} from './account-context.helper.js';
import {
    coerceNumber,
    withMeta,
    type TAccountMfa,
    type TToolResult
} from './account-tools-utils.js';
import {
    getAccountConnectorSummary,
    getAccountCurrentUsage,
    getAccountSecuritySummary,
    getAccountUsageSummary
} from './account-tools-single.helper.js';

const normalizeWorkloadValue = (value: unknown) => String(value || '').trim().toLowerCase();
const WORKLOAD_TYPE_ALIASES: Record<string, string[]> = {
    'Microsoft 365': ['m365', 'o365', 'office 365', '365', 'microsoft365', 'microsoft 365'],
    'Microsoft Entra ID': ['entra', 'entra id', 'microsoft entra id', 'azure ad', 'aad', 'azuread'],
    'Google Workspace': ['google workspace', 'workspace', 'google ws', 'gsuite', 'g suite'],
    'Salesforce': ['salesforce', 'sfdc', 'sf'],
    'Azure DevOps': ['azure devops', 'ado', 'azdo', 'devops'],
    'Power BI': ['power bi', 'powerbi'],
    'Dynamics 365': ['dynamics 365', 'd365'],
    'Zendesk': ['zendesk']
};

const getCanonicalWorkloadFilter = (value?: string | null) => {
    if (!value) {
        return null;
    }
    const normalized = normalizeWorkloadValue(value);
    for (const [canonical, aliases] of Object.entries(WORKLOAD_TYPE_ALIASES)) {
        const candidates = [canonical, ...aliases].map(normalizeWorkloadValue);
        if (candidates.includes(normalized)) {
            return canonical;
        }
    }
    return String(value).trim();
};

const workloadMatchesFilter = (workload: Record<string, unknown>, filterValue?: string | null) => {
    if (!filterValue) {
        return true;
    }
    const canonicalFilter = getCanonicalWorkloadFilter(filterValue);
    const normalizedFilter = normalizeWorkloadValue(canonicalFilter);
    const candidates = [workload.type, workload.connector_type].filter(Boolean).map(normalizeWorkloadValue);
    return candidates.some((candidate) => candidate.includes(normalizedFilter));
};

const aggregateMspPeriodWorkloads = (results: Array<Record<string, unknown>>, workloadFilter?: string) => {
    const workloadMap = new Map<string, { type: string; account_count: number; connector_count: number; max_seats_count: number; }>();
    for (const result of results) {
        for (const usageWorkload of (result.workloads as Array<Record<string, unknown>>) || []) {
            if (!workloadMatchesFilter(usageWorkload, workloadFilter)) {
                continue;
            }
            const workloadType = String(usageWorkload.type || 'Unknown');
            const aggregate = workloadMap.get(workloadType) || {
                type: workloadType,
                account_count: 0,
                connector_count: 0,
                max_seats_count: 0
            };
            aggregate.account_count += 1;
            aggregate.connector_count += coerceNumber(usageWorkload.connector_count) || 0;
            aggregate.max_seats_count += coerceNumber(usageWorkload.max_seats_count) || 0;
            workloadMap.set(workloadType, aggregate);
        }
    }
    return Array.from(workloadMap.values()).sort((left, right) => left.type.localeCompare(right.type));
};

const aggregateMspCurrentWorkloads = (results: Array<Record<string, unknown>>, workloadFilter?: string) => {
    const workloadMap = new Map<string, { type: string; account_count: number; connector_count: number; current_seats_count: number; }>();
    for (const result of results) {
        for (const currentWorkload of (result.workloads as Array<Record<string, unknown>>) || []) {
            if (!workloadMatchesFilter(currentWorkload, workloadFilter)) {
                continue;
            }
            const workloadType = String(currentWorkload.type || 'Unknown');
            const aggregate = workloadMap.get(workloadType) || {
                type: workloadType,
                account_count: 0,
                connector_count: 0,
                current_seats_count: 0
            };
            aggregate.account_count += 1;
            aggregate.connector_count += coerceNumber(currentWorkload.connector_count) || 0;
            aggregate.current_seats_count += coerceNumber(currentWorkload.current_seats_count) || 0;
            workloadMap.set(workloadType, aggregate);
        }
    }
    return Array.from(workloadMap.values()).sort((left, right) => left.type.localeCompare(right.type));
};

const getScopeAccounts = async (authConfig: IAuthConfig, options: { accountId?: string; scope?: string; defaultScope?: 'account' | 'children' | 'leaf' | 'managed' | 'all'; }) => {
    const cache = createRequestCache();
    const resolvedAccounts = await getAccountsForScope(authConfig, {
        accountId: options.accountId,
        scope: options.scope,
        defaultScope: options.defaultScope ?? 'all',
        exactOnAccountId: false,
        cache
    });
    return { cache, resolvedAccounts };
};

export const getMspOverview = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawOverviewResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const summary = await getAccountConnectorSummary(authConfig, account.id);
            const summaryObject = summary.result as Record<string, unknown>;
            const summaryDetails = summaryObject.summary as Record<string, unknown>;
            return {
                data: {
                    account_name: summaryDetails.account_name || account.account_name,
                    connector_count: summaryDetails.connector_count,
                    unhealthy_connector_count: summaryDetails.unhealthy_connectors_count
                },
                warning: null as string | null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const overviewWarnings: string[] = [];
    const accountSummaries: Array<Record<string, unknown>> = [];
    for (const result of rawOverviewResults) {
        if (result.data !== null) accountSummaries.push(result.data);
        if (result.warning) overviewWarnings.push(result.warning);
    }
    return withMeta({
        totals: {
            accounts: resolvedAccounts.accounts.length,
            connectors: accountSummaries.reduce((sum, account) => sum + (coerceNumber(account.connector_count) || 0), 0),
            unhealthy_connectors: accountSummaries.reduce((sum, account) => sum + (coerceNumber(account.unhealthy_connector_count) || 0), 0)
        },
        accounts: accountSummaries
    }, ['MSP overview retrieved successfully'].concat(resolvedAccounts.warnings).concat(overviewWarnings), buildScopeMeta('get_msp_overview', resolvedAccounts));
};

export const getMspSecurityOverview = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawSecurityResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const summary = await getAccountSecuritySummary(authConfig, account.id);
            return { data: summary.result.summary as Record<string, unknown>, warning: null as string | null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const securityWarnings: string[] = [];
    const accountSummaries: Array<Record<string, unknown>> = [];
    for (const result of rawSecurityResults) {
        if (result.data !== null) accountSummaries.push(result.data);
        if (result.warning) securityWarnings.push(result.warning);
    }
    return withMeta({
        summary: {
            account_count: accountSummaries.length,
            account_mfa_enabled_count: accountSummaries.filter((item) => (item.account_mfa as TAccountMfa | undefined)?.enabled === true).length,
            sso_enabled_count: accountSummaries.filter((item) => (item.sso as { enabled?: boolean; } | undefined)?.enabled === true).length,
            users_total: accountSummaries.reduce((sum, item) => sum + (coerceNumber(item.users_total) || 0), 0),
            users_with_mfa_configured: accountSummaries.reduce((sum, item) => sum + (coerceNumber(item.users_with_mfa_configured) || 0), 0),
            users_without_mfa_configured: accountSummaries.reduce((sum, item) => sum + (coerceNumber(item.users_without_mfa_configured) || 0), 0),
            users_with_expiry: accountSummaries.reduce((sum, item) => sum + (coerceNumber(item.users_with_expiry) || 0), 0),
            users_receiving_messages: accountSummaries.reduce((sum, item) => sum + (coerceNumber(item.users_receiving_messages) || 0), 0)
        },
        accounts: accountSummaries
    }, ['MSP security overview retrieved successfully'].concat(resolvedAccounts.warnings).concat(securityWarnings), buildScopeMeta('get_msp_security_overview', resolvedAccounts));
};

export const getMspUsageOverview = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; fromDate?: string; toDate?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawUsageResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const usage = await getAccountUsageSummary(authConfig, { accountId: account.id, fromDate: options.fromDate, toDate: options.toDate });
            return { data: { account_name: account.account_name, ...(usage.result as Record<string, unknown>) }, warning: null as string | null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const usageWarnings: string[] = [];
    const accountResults: Array<Record<string, unknown>> = [];
    for (const result of rawUsageResults) {
        if (result.data !== null) accountResults.push(result.data);
        if (result.warning) usageWarnings.push(result.warning);
    }
    const workloads = aggregateMspPeriodWorkloads(accountResults, undefined);
    return withMeta({
        summary: {
            account_count: accountResults.length,
            period_from: accountResults[0]?.period_from || null,
            period_to: accountResults[0]?.period_to || null,
            max_seats_count: accountResults.reduce((sum, item) => sum + (coerceNumber(item.max_seats_count) || 0), 0),
            workload_count: workloads.length
        },
        accounts: accountResults.map((item) => ({
            account_name: item.account_name || null,
            max_seats_count: coerceNumber(item.max_seats_count) || 0,
            workload_count: coerceNumber(item.workload_count) || 0
        })),
        workloads
    }, ['MSP usage overview retrieved successfully'].concat(resolvedAccounts.warnings).concat(usageWarnings), buildScopeMeta('get_msp_usage_overview', resolvedAccounts));
};

export const getMspCurrentUsageOverview = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawCurrentUsageResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const usage = await getAccountCurrentUsage(authConfig, account.id);
            return { data: { account_name: account.account_name, ...(usage.result as Record<string, unknown>) }, warning: null as string | null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const currentUsageWarnings: string[] = [];
    const accountResults: Array<Record<string, unknown>> = [];
    for (const result of rawCurrentUsageResults) {
        if (result.data !== null) accountResults.push(result.data);
        if (result.warning) currentUsageWarnings.push(result.warning);
    }
    const workloads = aggregateMspCurrentWorkloads(accountResults, undefined);
    return withMeta({
        summary: {
            account_count: accountResults.length,
            current_seats_count: accountResults.reduce((sum, item) => sum + (coerceNumber(item.current_seats_count) || 0), 0),
            workload_count: workloads.length
        },
        accounts: accountResults.map((item) => ({
            account_name: item.account_name || null,
            current_seats_count: coerceNumber(item.current_seats_count) || 0,
            workload_count: coerceNumber(item.workload_count) || 0
        })),
        workloads
    }, ['MSP current usage overview retrieved successfully'].concat(resolvedAccounts.warnings).concat(currentUsageWarnings), buildScopeMeta('get_msp_current_usage_overview', resolvedAccounts));
};

export const getMspWorkloadUsageSummary = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; fromDate?: string; toDate?: string; workloadType?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawWorkloadResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const usage = await getAccountUsageSummary(authConfig, {
                accountId: account.id,
                fromDate: options.fromDate,
                toDate: options.toDate
            });
            return { data: { account_name: account.account_name, ...(usage.result as Record<string, unknown>) }, warning: null as string | null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const workloadWarnings: string[] = [];
    const accountResults: Array<Record<string, unknown>> = [];
    for (const result of rawWorkloadResults) {
        if (result.data !== null) accountResults.push(result.data);
        if (result.warning) workloadWarnings.push(result.warning);
    }
    const workloads = aggregateMspPeriodWorkloads(accountResults, options.workloadType);
    return withMeta({
        summary: {
            account_count: accountResults.length,
            period_from: accountResults[0]?.period_from || null,
            period_to: accountResults[0]?.period_to || null,
            max_seats_count: accountResults.reduce((sum, item) => sum + (coerceNumber(item.max_seats_count) || 0), 0),
            workload_count: workloads.length
        },
        accounts: accountResults.map((item) => ({
            account_name: item.account_name || null,
            max_seats_count: coerceNumber(item.max_seats_count) || 0,
            workload_count: coerceNumber(item.workload_count) || 0
        })),
        workloads
    }, ['MSP workload usage summary retrieved successfully'].concat(resolvedAccounts.warnings).concat(workloadWarnings), buildScopeMeta('get_msp_workload_usage_summary', resolvedAccounts));
};

export const getMspCurrentWorkloadUsageSummary = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; workloadType?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawCurrentWorkloadResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const usage = await getAccountCurrentUsage(authConfig, account.id);
            return { data: { account_name: account.account_name, ...(usage.result as Record<string, unknown>) }, warning: null as string | null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const currentWorkloadWarnings: string[] = [];
    const accountResults: Array<Record<string, unknown>> = [];
    for (const result of rawCurrentWorkloadResults) {
        if (result.data !== null) accountResults.push(result.data);
        if (result.warning) currentWorkloadWarnings.push(result.warning);
    }
    const workloads = aggregateMspCurrentWorkloads(accountResults, options.workloadType);
    return withMeta({
        summary: {
            account_count: accountResults.length,
            current_seats_count: accountResults.reduce((sum, item) => sum + (coerceNumber(item.current_seats_count) || 0), 0),
            workload_count: workloads.length
        },
        accounts: accountResults.map((item) => ({
            account_name: item.account_name || null,
            current_seats_count: coerceNumber(item.current_seats_count) || 0,
            workload_count: coerceNumber(item.workload_count) || 0
        })),
        workloads
    }, ['MSP current workload usage summary retrieved successfully'].concat(resolvedAccounts.warnings).concat(currentWorkloadWarnings), buildScopeMeta('get_msp_current_workload_usage_summary', resolvedAccounts));
};

export const getMspConnectorSummary = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; scope?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccounts } = await getScopeAccounts(authConfig, options);
    const rawConnectorSummaryResults = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const summary = await getAccountConnectorSummary(authConfig, account.id);
            return {
                data: {
                    account_id: account.id,
                    account_name: account.account_name,
                    summary: summary.result.summary as Record<string, unknown>,
                    workloads: summary.result.workloads as Array<Record<string, unknown>>,
                    connectors: summary.result.connectors as Array<Record<string, unknown>>
                },
                warning: null as string | null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { data: null, warning: `Failed to load account ${account.id}: ${message}` };
        }
    });
    const connectorSummaryWarnings: string[] = [];
    const summaries: Array<{
        account_id: string;
        account_name: string | null;
        summary: Record<string, unknown>;
        workloads: Array<Record<string, unknown>>;
        connectors: Array<Record<string, unknown>>;
    }> = [];
    for (const result of rawConnectorSummaryResults) {
        if (result.data !== null) summaries.push(result.data);
        if (result.warning) connectorSummaryWarnings.push(result.warning);
    }
    const workloadMap = new Map<string, { type: string; connector_count: number; unhealthy_connector_count: number; }>();
    const connectors: Array<Record<string, unknown>> = [];
    for (const summary of summaries) {
        connectors.push(...summary.connectors.map((connector) => ({
            ...connector,
            account_id: summary.account_id,
            account_name: summary.account_name
        })));
        for (const workload of summary.workloads) {
            const type = String(workload.type || 'Unknown');
            const aggregate = workloadMap.get(type) || { type, connector_count: 0, unhealthy_connector_count: 0 };
            aggregate.connector_count += coerceNumber(workload.connector_count) || 0;
            aggregate.unhealthy_connector_count += coerceNumber(workload.unhealthy_connector_count) || 0;
            workloadMap.set(type, aggregate);
        }
    }
    return withMeta({
        summary: {
            account_count: resolvedAccounts.accounts.length,
            connector_count: connectors.length,
            unhealthy_connectors_count: connectors.filter((connector) => ['unhealthy', 'critical'].includes(String(connector.health || 'unknown'))).length,
            workload_count: workloadMap.size
        },
        workloads: Array.from(workloadMap.values()).sort((left, right) => left.type.localeCompare(right.type)),
        connectors
    }, ['MSP connector summary retrieved successfully'].concat(resolvedAccounts.warnings).concat(connectorSummaryWarnings), buildScopeMeta('get_msp_connector_summary', resolvedAccounts));
};
