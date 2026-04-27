/**
 * Single-account tool helpers.
 *
 * This file owns all functions that operate on exactly one account at a time:
 * info, contact, MFA, SSO, user/token listing, usage, resources, summary,
 * security, token summary, and connector summary. MSP fan-out equivalents live
 * in account-tools-msp.helper.ts and delegate back to these functions.
 */
import { getTokenByGuid, getTokens } from '../../api/authentication-api.js';
import {
    getAccountMaxUsageTotal,
    getAccountMfaStatus,
    getAccountResources,
    getAccountSsoStatus,
    getTokenAttributes,
    getUserMfaStatus
} from '../../api/account-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { parseISO8601Duration } from '../../helpers/date.helper.js';
import { validateAccountId } from '../../utils/sanitizers/account-id.sanitizer.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import {
    createRequestCache,
    getAccountDetails,
    getPrimaryContactDetails,
    mapWithConcurrency,
    type IScopedAccount,
    type TRequestCache
} from './account-context.helper.js';
import { getAuditLogHistory } from '../audit-logs/audit-logs-tools.helper.js';
import { getConnectorHealth, getScopedConnectors, type IScopedConnector } from '../connector/connectors-tools.helper.js';
import { getConnectorTypeLabel, CONNECTOR_TYPE_RESOURCE_NAMES } from '../../helpers/connector-types.helper.js';
import {
    coerceNumber,
    withMeta,
    type TAccountMfa,
    type TAccountSso,
    type TResource,
    type TTokenLike,
    type TToolResult,
    type TUserMfa
} from './account-tools-utils.js';

const summarizeMfaRules = (rules: Array<Record<string, unknown>>): TUserMfa => ({
    configured: rules.some((rule) => ['configured', 'ok'].includes(String(rule?.status || '').toLowerCase())),
    rules
});

const summarizeNotificationSetting = (attributes: Array<{ name?: string | null; value?: string | null; }>): boolean => {
    const notificationAttribute = attributes.find((attribute) => attribute?.name === 'enable-notification');
    // Absent attribute means the account hasn't opted out — treat as enabled.
    if (!notificationAttribute) {
        return true;
    }
    const rawValue = String(notificationAttribute.value ?? '').trim().toLowerCase();
    if (['0', 'false', 'off', 'disabled', 'no'].includes(rawValue)) {
        return false;
    }
    if (['1', 'true', 'on', 'enabled', 'yes'].includes(rawValue)) {
        return true;
    }
    return true;
};

const parseIsoDuration = (duration: string | null | undefined) => {
    try {
        return parseISO8601Duration(String(duration ?? '').trim());
    } catch {
        logger.debug(`[ACCOUNT_TOOLS] Failed to parse ISO duration "${String(duration ?? '').trim()}"`);
        return null;
    }
};

const deriveExpiryTimestamp = (created: string | null | undefined, lifetime: string | null | undefined): string | null => {
    if (!created || !lifetime) {
        return null;
    }
    const parsed = parseIsoDuration(lifetime);
    const base = new Date(created);
    if (!parsed || Number.isNaN(base.getTime())) {
        return null;
    }
    const result = new Date(base.getTime());
    if (parsed.years) result.setUTCFullYear(result.getUTCFullYear() + parsed.years);
    if (parsed.months) result.setUTCMonth(result.getUTCMonth() + parsed.months);
    if (parsed.weeks) result.setUTCDate(result.getUTCDate() + parsed.weeks * 7);
    if (parsed.days) result.setUTCDate(result.getUTCDate() + parsed.days);
    if (parsed.hours) result.setUTCHours(result.getUTCHours() + parsed.hours);
    if (parsed.minutes) result.setUTCMinutes(result.getUTCMinutes() + parsed.minutes);
    if (parsed.seconds) result.setUTCSeconds(result.getUTCSeconds() + parsed.seconds);
    return result.toISOString();
};

const getAccountMfaSummary = async (authConfig: IAuthConfig, accountId: string): Promise<TAccountMfa> => {
    try {
        const { requestConfig, applyDataCallback } = getAccountMfaStatus(accountId);
        return await makeRequest<TAccountMfa>(requestConfig, authConfig, applyDataCallback);
    } catch {
        logger.info(`[ACCOUNT_MFA] No account MFA status available for ${accountId}`);
        return { enabled: false, totp: false, trusted_ips: false };
    }
};

const getAccountSsoSummary = async (authConfig: IAuthConfig, accountId: string): Promise<TAccountSso> => {
    try {
        const { requestConfig, applyDataCallback } = getAccountSsoStatus(accountId);
        return await makeRequest<TAccountSso>(requestConfig, authConfig, applyDataCallback);
    } catch {
        logger.info(`[ACCOUNT_SSO] No account SSO status available for ${accountId}`);
        return { enabled: false, configurations: [] };
    }
};

const getTokenDetails = async (authConfig: IAuthConfig, accountId: string, tokenGuid: string): Promise<TTokenLike | null> => {
    try {
        const { requestConfig, applyDataCallback } = getTokenByGuid(accountId, tokenGuid);
        return await makeRequest<TTokenLike | null>(requestConfig, authConfig, applyDataCallback);
    } catch {
        logger.info(`[ACCOUNT_USERS] No detailed token payload available for ${tokenGuid} on ${accountId}`);
        return null;
    }
};

const getUserMfaSummary = async (authConfig: IAuthConfig, accountId: string, username: string): Promise<TUserMfa | null> => {
    try {
        const { requestConfig, applyDataCallback } = getUserMfaStatus(accountId, username);
        const rules = await makeRequest<Array<Record<string, unknown>>>(requestConfig, authConfig, applyDataCallback);
        return summarizeMfaRules(rules);
    } catch {
        logger.info(`[ACCOUNT_USERS] No MFA status available for ${username} on ${accountId}`);
        return null;
    }
};

const getUserMessageDeliverySetting = async (authConfig: IAuthConfig, accountId: string, username: string): Promise<boolean> => {
    try {
        const { requestConfig, applyDataCallback } = getTokenAttributes(accountId, username);
        const attributes = await makeRequest<Array<{ name?: string | null; value?: string | null; }>>(requestConfig, authConfig, applyDataCallback);
        return summarizeNotificationSetting(attributes);
    } catch {
        logger.info(`[ACCOUNT_USERS] No notification attributes available for ${username} on ${accountId}`);
        return true;
    }
};

const getWorkloadGroups = (connectors: IScopedConnector[]) => {
    const grouped = new Map<string, IScopedConnector[]>();
    for (const connector of connectors) {
        const key = connector.type || 'unknown';
        const batch = grouped.get(key) || [];
        batch.push(connector);
        grouped.set(key, batch);
    }
    return Array.from(grouped.entries());
};

const getCurrentSeatsForConnectorType = (resources: TResource[], connectorType: string) => {
    const candidateNames = CONNECTOR_TYPE_RESOURCE_NAMES[connectorType] || [];
    for (const candidateName of candidateNames) {
        const matchedResource = resources.find((resource) => resource?.name === candidateName);
        const usage = coerceNumber(matchedResource?.usage);
        if (matchedResource && usage !== null) {
            return { current_seats_count: usage, resource_name: candidateName };
        }
    }
    return { current_seats_count: null, resource_name: null };
};

const buildCurrentWorkloads = (connectors: IScopedConnector[], resources: TResource[]) =>
    getWorkloadGroups(connectors).map(([connectorType, connectorsForType]) => {
        const currentUsage = getCurrentSeatsForConnectorType(resources, connectorType);
        return {
            type: getConnectorTypeLabel(connectorType),
            connector_type: connectorType,
            connector_count: connectorsForType.length,
            current_seats_count: currentUsage.current_seats_count,
            current_seats_resource: currentUsage.resource_name
        };
    });

const buildPeriodWorkloads = async (
    authConfig: IAuthConfig,
    accountId: string,
    connectors: IScopedConnector[],
    periodFrom: string,
    periodTo: string
) => {
    const workloads: Array<Record<string, unknown>> = [];
    for (const [connectorType, connectorsForType] of getWorkloadGroups(connectors)) {
        const { requestConfig, applyDataCallback } = getAccountMaxUsageTotal(accountId, {
            range: { from: periodFrom, to: periodTo },
            'connector-type': connectorType
        });
        let maxUsageForType: number | null = null;
        try {
            const workloadUsage = await makeRequest<{ seats_count?: unknown; }>(requestConfig, authConfig, applyDataCallback);
            maxUsageForType = coerceNumber(workloadUsage?.seats_count);
        } catch {
            logger.info(`[ACCOUNT_USAGE] No max usage available for connector type ${connectorType} on ${accountId}`);
        }
        workloads.push({
            type: getConnectorTypeLabel(connectorType),
            connector_type: connectorType,
            connector_count: connectorsForType.length,
            max_seats_count: maxUsageForType
        });
    }
    return workloads;
};

const formatUtcDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateOnly = (value: string | undefined, fieldName: string): string | null => {
    if (!value) {
        return null;
    }
    const normalized = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        throw new Error(`${fieldName} must use YYYY-MM-DD format`);
    }
    // Append an explicit UTC midnight to prevent the Date constructor from
    // interpreting a bare YYYY-MM-DD as local midnight, which shifts the date
    // in negative-offset timezones.
    const date = new Date(`${normalized}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldName} is not a valid date`);
    }
    // Return the original YYYY-MM-DD string, not the Date object, so the
    // caller controls how it's serialised (the API expects plain date strings).
    return normalized;
};

const getDefaultLastMonthRange = () => {
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 24 * 60 * 60 * 1000);
    const firstDayOfPreviousMonth = new Date(Date.UTC(lastDayOfPreviousMonth.getUTCFullYear(), lastDayOfPreviousMonth.getUTCMonth(), 1));
    return {
        from: formatUtcDate(firstDayOfPreviousMonth),
        to: formatUtcDate(lastDayOfPreviousMonth),
        mode: 'last_month'
    };
};

const resolveUsageDateRange = (fromDate?: string, toDate?: string) => {
    const normalizedFrom = parseDateOnly(fromDate, 'from_date');
    const normalizedTo = parseDateOnly(toDate, 'to_date');
    const today = formatUtcDate(new Date());
    if (normalizedFrom && normalizedTo) {
        if (normalizedFrom > normalizedTo) {
            throw new Error('from_date must be on or before to_date');
        }
        return { from: normalizedFrom, to: normalizedTo, mode: 'custom_range' };
    }
    if (normalizedFrom && !normalizedTo) {
        if (normalizedFrom > today) {
            throw new Error('from_date must be on or before today');
        }
        return { from: normalizedFrom, to: today, mode: 'from_to_today' };
    }
    if (!normalizedFrom && normalizedTo) {
        throw new Error('to_date requires from_date');
    }
    return getDefaultLastMonthRange();
};

const mapAccountUser = (accountId: string, token: TTokenLike, mfa: TUserMfa | null, receivesMessages: boolean) => ({
    account_id: accountId,
    username: token?.aname || null,
    display_name: token?.descr || null,
    guid: token?.guid || null,
    created: token?.created || null,
    last_use: token?.lastuse || null,
    acl: token?.acl || null,
    primary_username: token?.primary_aname || null,
    expires: token?.expires || null,
    has_expiry: !!token?.expires,
    receives_messages: receivesMessages,
    mfa: mfa ?? null
});

const mapSecondaryToken = (accountId: string, token: TTokenLike) => ({
    account_id: accountId,
    guid: token?.guid || null,
    name: token?.descr || null,
    created: token?.created || null,
    last_use: token?.lastuse || null,
    primary_user: token?.primary_aname || null,
    expires_at: deriveExpiryTimestamp(token?.created, token?.lifetime)
});

const mapResourceUsage = (resource: TResource) => ({
    name: resource?.name || null,
    type: resource?.type || null,
    unit: resource?.unit || null,
    evaluated: resource?.evaluated || null,
    usage: coerceNumber(resource?.usage) ?? resource?.usage ?? null,
    limit: resource?.limit ?? null,
    violated: !!resource?.violated
});

const shouldIncludeResource = (resource: ReturnType<typeof mapResourceUsage>, includeZeroUsage = false) => {
    if (includeZeroUsage) {
        return true;
    }
    const numericUsage = coerceNumber(resource.usage);
    if (numericUsage !== null) {
        return numericUsage !== 0 || !!resource.violated;
    }
    if (typeof resource.usage === 'string' && resource.usage.trim()) {
        return true;
    }
    return !!resource.violated;
};

const getAccountContext = async (authConfig: IAuthConfig, accountId?: string, externalCache?: TRequestCache) => {
    if (accountId) {
        validateAccountId(accountId);
    }
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const cache = externalCache ?? createRequestCache();
    const account = await getAccountDetails(authConfig, resolvedAccountId, cache);
    return { resolvedAccountId, cache, account };
};

export const getAccountInfo = async (authConfig: IAuthConfig, accountId?: string, externalCache?: TRequestCache): Promise<TToolResult<Record<string, unknown>>> => {
    try {
        const { resolvedAccountId, cache, account } = await getAccountContext(authConfig, accountId, externalCache);
        const [primaryContact, mfa, sso, tokenResponse, resources, scopedConnectors] = await Promise.all([
            getPrimaryContactDetails(authConfig, resolvedAccountId, cache),
            getAccountMfaSummary(authConfig, resolvedAccountId),
            getAccountSsoSummary(authConfig, resolvedAccountId),
            (async () => {
                const { requestConfig, applyDataCallback } = getTokens(resolvedAccountId, { secondary: 1 });
                return makeRequest<TTokenLike[]>(requestConfig, authConfig, applyDataCallback);
            })(),
            (async () => {
                const { requestConfig, applyDataCallback } = getAccountResources(resolvedAccountId);
                return makeRequest<TResource[]>(requestConfig, authConfig, applyDataCallback);
            })(),
            getScopedConnectors(authConfig, {
                accountId: resolvedAccountId,
                scope: 'account',
                defaultScope: 'account',
                exactOnAccountId: true,
                cache
            })
        ]);
        const connectors = scopedConnectors.connectors;
        const workloads = buildCurrentWorkloads(connectors, resources);
        const secondaryTokenCount = Array.isArray(tokenResponse)
            ? tokenResponse.filter((token) => token?.primary === false || token?.primary === 'false').length
            : 0;
        const currentSeatsCount = workloads.reduce((sum, workload) => sum + (coerceNumber(workload.current_seats_count) || 0), 0);

        return withMeta({
            account_name: account.account_name,
            primary_contact_name: primaryContact?.full_name || null,
            external_id: account.external_id,
            product_name: account.product_name,
            secondary_token_count: secondaryTokenCount,
            current_seats_count: currentSeatsCount,
            workload_count: workloads.length,
            connector_count: connectors.length,
            mfa: { enabled: mfa.enabled },
            sso: { enabled: sso.enabled }
        }, ['Account information retrieved successfully'], {
            requested_account_id: resolvedAccountId,
            scope: 'account',
            resolved_account_ids: [resolvedAccountId]
        });
    } catch (error) {
        logger.error('[ACCOUNT_INFO] Error getting account info:', error);
        throw error;
    }
};

export const getAccountContactInfo = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccountId, cache } = await getAccountContext(authConfig, accountId);
    const contact = await getPrimaryContactDetails(authConfig, resolvedAccountId, cache);
    const accountMfa = await getAccountMfaSummary(authConfig, resolvedAccountId);
    let enrichedContact: Record<string, unknown> | null = contact;
    if (contact?.email) {
        try {
            const { requestConfig, applyDataCallback } = getTokens(resolvedAccountId);
            const tokens = await makeRequest<TTokenLike[]>(requestConfig, authConfig, applyDataCallback);
            const matchedToken = Array.isArray(tokens)
                ? tokens.find((token) => String(token?.aname || '').toLowerCase() === String(contact.email).toLowerCase())
                : null;
            const detailedToken = matchedToken?.guid ? await getTokenDetails(authConfig, resolvedAccountId, matchedToken.guid) : matchedToken;
            const mfa = await getUserMfaSummary(authConfig, resolvedAccountId, contact.email);
            const receivesMessages = await getUserMessageDeliverySetting(authConfig, resolvedAccountId, contact.email);
            enrichedContact = {
                ...contact,
                username: detailedToken?.aname || contact.email || null,
                display_name: detailedToken?.descr || contact.full_name || null,
                guid: detailedToken?.guid || null,
                created: detailedToken?.created || null,
                last_use: detailedToken?.lastuse || null,
                acl: detailedToken?.acl || null,
                primary_username: detailedToken?.primary_aname || null,
                expires: detailedToken?.expires || null,
                has_expiry: !!detailedToken?.expires,
                receives_messages: receivesMessages,
                mfa: mfa ?? null
            };
        } catch (error) {
            logger.info(`[ACCOUNT_INFO] Could not enrich primary contact for ${resolvedAccountId}: ${error instanceof Error ? error.message : String(error)}`);
            enrichedContact = {
                ...contact,
                username: contact.email || null,
                display_name: contact.full_name || null,
                guid: null,
                created: null,
                last_use: null,
                acl: null,
                primary_username: null,
                expires: null,
                has_expiry: false,
                receives_messages: true,
                mfa: null
            };
        }
    }
    return withMeta({
        account_id: resolvedAccountId,
        primary_contact: enrichedContact,
        mfa: accountMfa
    }, [enrichedContact ? 'Primary contact information retrieved successfully' : 'No primary contact information available'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountMfaInfo = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    if (accountId) validateAccountId(accountId);
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const mfa = await getAccountMfaSummary(authConfig, resolvedAccountId);
    return withMeta({ account_id: resolvedAccountId, mfa }, ['Account MFA information retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountSsoInfo = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    if (accountId) validateAccountId(accountId);
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const sso = await getAccountSsoSummary(authConfig, resolvedAccountId);
    return withMeta({ account_id: resolvedAccountId, sso }, ['Account SSO information retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getUserMfaInfo = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; username?: string; }
): Promise<TToolResult<Record<string, unknown>>> => {
    if (options.accountId) validateAccountId(options.accountId);
    const resolvedAccountId = options.accountId || authConfig.keepitGuid;
    const username = options.username;
    if (!username) {
        throw new Error('username is required');
    }
    const mfa = await getUserMfaSummary(authConfig, resolvedAccountId, username);
    return withMeta({
        account_id: resolvedAccountId,
        username,
        mfa: mfa ?? { configured: false, rules: [] }
    }, ['User MFA information retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const listAccountUsers = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    if (accountId) validateAccountId(accountId);
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const { requestConfig, applyDataCallback } = getTokens(resolvedAccountId);
    const response = await makeRequest<TTokenLike[]>(requestConfig, authConfig, applyDataCallback);
    const primaryTokens = Array.isArray(response)
        ? response.filter((token) => token?.primary === true || token?.primary === 'true')
        : [];
    const users = await mapWithConcurrency(primaryTokens, async (token) => {
        const username = token?.aname || token?.primary_aname;
        const [detailedToken, mfa, receivesMessages] = await Promise.all([
            token?.guid ? getTokenDetails(authConfig, resolvedAccountId, token.guid) : Promise.resolve(null),
            username ? getUserMfaSummary(authConfig, resolvedAccountId, username) : Promise.resolve(null),
            username ? getUserMessageDeliverySetting(authConfig, resolvedAccountId, username) : Promise.resolve(true)
        ]);
        return mapAccountUser(resolvedAccountId, detailedToken || token, mfa, receivesMessages);
    });
    return withMeta({ account_id: resolvedAccountId, users }, [`Found ${users.length} account users`], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const listAccountTokens = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    if (accountId) validateAccountId(accountId);
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const { requestConfig, applyDataCallback } = getTokens(resolvedAccountId, { secondary: 1 });
    const response = await makeRequest<TTokenLike[]>(requestConfig, authConfig, applyDataCallback);
    const secondaryTokens = Array.isArray(response)
        ? response.filter((token) => token?.primary === false || token?.primary === 'false')
        : [];
    const tokens = secondaryTokens.map((token) => mapSecondaryToken(resolvedAccountId, token));
    return withMeta({ account_id: resolvedAccountId, tokens }, [`Found ${tokens.length} secondary account tokens`], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountUsageSummary = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; fromDate?: string; toDate?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccountId, cache, account } = await getAccountContext(authConfig, options.accountId);
    const scopedConnectors = await getScopedConnectors(authConfig, {
        accountId: resolvedAccountId,
        scope: 'account',
        defaultScope: 'account',
        exactOnAccountId: true,
        cache
    });
    const resolvedRange = resolveUsageDateRange(options.fromDate, options.toDate);
    const { requestConfig, applyDataCallback } = getAccountMaxUsageTotal(resolvedAccountId, {
        range: { from: resolvedRange.from, to: resolvedRange.to }
    });
    const usage = await makeRequest<{ seats_count?: unknown; account_type?: string | null; }>(requestConfig, authConfig, applyDataCallback);
    const workloads = await buildPeriodWorkloads(authConfig, resolvedAccountId, scopedConnectors.connectors, resolvedRange.from, resolvedRange.to);
    return withMeta({
        account_name: account.account_name,
        period_from: resolvedRange.from,
        period_to: resolvedRange.to,
        max_seats_count: coerceNumber(usage?.seats_count) ?? 0,
        workload_count: workloads.length,
        account_type: usage?.account_type || null,
        workloads
    }, ['Account usage summary retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId],
        usage_range_mode: resolvedRange.mode
    });
};

export const getAccountCurrentUsage = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccountId, cache, account } = await getAccountContext(authConfig, accountId);
    const [resources, scopedConnectors] = await Promise.all([
        (async () => {
            const { requestConfig, applyDataCallback } = getAccountResources(resolvedAccountId);
            return makeRequest<TResource[]>(requestConfig, authConfig, applyDataCallback);
        })(),
        getScopedConnectors(authConfig, {
            accountId: resolvedAccountId,
            scope: 'account',
            defaultScope: 'account',
            exactOnAccountId: true,
            cache
        })
    ]);
    const workloads = buildCurrentWorkloads(scopedConnectors.connectors, resources);
    const currentSeatsCount = workloads.reduce((sum, workload) => sum + (coerceNumber(workload.current_seats_count) || 0), 0);
    return withMeta({
        account_name: account.account_name,
        current_seats_count: currentSeatsCount,
        workload_count: workloads.length,
        workloads
    }, ['Current account usage retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountResourceUsage = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; includeZeroUsage?: boolean; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const { resolvedAccountId, account } = await getAccountContext(authConfig, options.accountId);
    const { requestConfig, applyDataCallback } = getAccountResources(resolvedAccountId);
    const resources = await makeRequest<TResource[]>(requestConfig, authConfig, applyDataCallback);
    const mappedResources = resources.map(mapResourceUsage).filter((resource) => shouldIncludeResource(resource, options.includeZeroUsage === true));
    return withMeta({
        account_id: resolvedAccountId,
        account_name: account.account_name,
        resources: mappedResources
    }, ['Account resource usage retrieved successfully'], {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountSummary = async (
    authConfig: IAuthConfig,
    options: { accountId?: string; auditDuration?: string; } = {}
): Promise<TToolResult<Record<string, unknown>>> => {
    const cache = createRequestCache();
    const accountInfo = await getAccountInfo(authConfig, options.accountId, cache);
    const resolvedAccountId = options.accountId || authConfig.keepitGuid;
    const scopedConnectors = await getScopedConnectors(authConfig, {
        accountId: resolvedAccountId,
        scope: 'account',
        defaultScope: 'account',
        exactOnAccountId: true,
        cache
    });
    const healthResults = await mapWithConcurrency(scopedConnectors.connectors, async (connector) => {
        try {
            return await getConnectorHealth({ guid: connector.guid, account_id: connector.account_id }, authConfig);
        } catch (error) {
            logger.warn(`[ACCOUNT_SUMMARY] Could not load health for connector ${connector.guid}: ${error instanceof Error ? error.message : String(error)}`);
            return { connector, health: 'unknown' };
        }
    });
    const unhealthyConnectors = healthResults.filter((item) => ['unhealthy', 'critical'].includes(item.health));
    const auditLogs = await getAuditLogHistory({
        duration: options.auditDuration || 'PT24H',
        account_id: resolvedAccountId,
        scope: 'account',
        pagination: { limit: 20, offset: 0 },
        include_actor_resolution: true,
        sort_order: 'desc'
    }, authConfig);
    return withMeta({
        account: {
            ...accountInfo.result,
            unhealthy_connectors_count: unhealthyConnectors.length
        },
        unhealthy_connectors: unhealthyConnectors.map((item) => ({ connector: item.connector, health: item.health })),
        recent_audit_events: auditLogs.result.auditLogs
    }, ['Account summary retrieved successfully'].concat(scopedConnectors.warnings), {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};

export const getAccountSecuritySummary = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    const accountInfo = await getAccountInfo(authConfig, accountId);
    const contactInfo = await getAccountContactInfo(authConfig, accountId);
    const userList = await listAccountUsers(authConfig, accountId);
    const users = (userList.result.users as Array<Record<string, unknown>>) || [];
    const sso = await getAccountSsoSummary(authConfig, accountId || authConfig.keepitGuid);
    return withMeta({
        summary: {
            account_name: accountInfo.result.account_name || null,
            primary_contact_name: contactInfo.result.primary_contact ? (contactInfo.result.primary_contact as Record<string, unknown>).full_name ?? null : null,
            account_mfa: contactInfo.result.mfa,
            sso: { enabled: sso.enabled },
            users_total: users.length,
            users_with_mfa_configured: users.filter((user) => (user.mfa as TUserMfa | null)?.configured === true).length,
            users_without_mfa_configured: users.filter((user) => (user.mfa as TUserMfa | null)?.configured === false || !user.mfa).length,
            users_with_expiry: users.filter((user) => user.has_expiry === true).length,
            users_receiving_messages: users.filter((user) => user.receives_messages === true).length
        }
    }, ['Account security summary retrieved successfully'], {
        requested_account_id: accountId || authConfig.keepitGuid,
        scope: 'account',
        resolved_account_ids: [accountId || authConfig.keepitGuid]
    });
};

export const getAccountTokenSummary = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    const accountInfo = await getAccountInfo(authConfig, accountId);
    const tokenSummary = await listAccountTokens(authConfig, accountId);
    const tokens = (tokenSummary.result.tokens as Array<Record<string, unknown>>) || [];
    const tokenUses = tokens.map((token) => token.last_use).filter(Boolean).map((value) => String(value)).sort().reverse();
    return withMeta({
        summary: {
            account_name: accountInfo.result.account_name || null,
            secondary_token_count: tokens.length,
            tokens_with_expiry_count: tokens.filter((token) => !!token.expires_at).length,
            tokens_without_expiry_count: tokens.filter((token) => !token.expires_at).length,
            most_recent_token_use: tokenUses[0] || null
        },
        tokens
    }, ['Account token summary retrieved successfully'], {
        requested_account_id: accountId || authConfig.keepitGuid,
        scope: 'account',
        resolved_account_ids: [accountId || authConfig.keepitGuid]
    });
};

export const getAccountConnectorSummary = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<Record<string, unknown>>> => {
    const cache = createRequestCache();
    const accountInfo = await getAccountInfo(authConfig, accountId, cache);
    const resolvedAccountId = accountId || authConfig.keepitGuid;
    const scopedConnectors = await getScopedConnectors(authConfig, {
        accountId: resolvedAccountId,
        scope: 'account',
        defaultScope: 'account',
        exactOnAccountId: true,
        cache
    });
    const healthResults = await mapWithConcurrency(scopedConnectors.connectors, async (connector) => {
        try {
            return await getConnectorHealth({ guid: connector.guid, account_id: connector.account_id }, authConfig);
        } catch (error) {
            logger.debug(`[ACCOUNT_CONNECTOR] Could not load health for connector ${connector.guid}: ${error instanceof Error ? error.message : String(error)}`);
            return { connector, health: 'unknown' };
        }
    });
    const workloadMap = new Map<string, { type: string; connector_count: number; unhealthy_connector_count: number; }>();
    for (const item of healthResults) {
        const type = item.connector.type_label || getConnectorTypeLabel(item.connector.type || null);
        const aggregate = workloadMap.get(type) || { type, connector_count: 0, unhealthy_connector_count: 0 };
        aggregate.connector_count += 1;
        if (['unhealthy', 'critical'].includes(item.health)) {
            aggregate.unhealthy_connector_count += 1;
        }
        workloadMap.set(type, aggregate);
    }
    return withMeta({
        summary: {
            account_name: accountInfo.result.account_name || null,
            connector_count: scopedConnectors.connectors.length,
            unhealthy_connectors_count: healthResults.filter((item) => ['unhealthy', 'critical'].includes(item.health)).length,
            workload_count: workloadMap.size
        },
        workloads: Array.from(workloadMap.values()).sort((left, right) => left.type.localeCompare(right.type)),
        connectors: healthResults.map((item) => ({
            name: item.connector.name || null,
            type: item.connector.type_label || getConnectorTypeLabel(item.connector.type || null),
            health: item.health
        }))
    }, ['Account connector summary retrieved successfully'].concat(scopedConnectors.warnings), {
        requested_account_id: resolvedAccountId,
        scope: 'account',
        resolved_account_ids: [resolvedAccountId]
    });
};
