/**
 * Audit log orchestration layer.
 *
 * This module resolves account scope, applies audit-specific filter logic,
 * handles single-account continuation offsets, masks tokens by default, and
 * computes aggregated summaries from raw log windows.
 */
import { AuditLogRequestSchema, AuditLogSummaryRequestSchema, AUDIT_LOG_DEFAULT_PAGE_SIZE, AUDIT_LOG_FETCH_CAP, AUDIT_LOG_MAX_PAGE_SIZE, AUDIT_LOG_UPSTREAM_PAGE_SIZE } from '../../utils/schemas/requests/audit-log.schemas.js';
import { getAuditLogHistorySettings } from '../../api/audit-logs-api.js';
import { getTokens } from '../../api/authentication-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { parseToolArgsOrThrow } from '../../helpers/tool.helper.js';
import { subtractPeriod } from '../../helpers/date.helper.js';
import { buildScopeMeta, createRequestCache, getAccountsForScope, mapWithConcurrency, memoizeRequest } from '../account/account-context.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { TResolvedAccounts } from '../account/account-context.helper.js';
import type { z } from 'zod';

type AuditLogRequest = z.infer<typeof AuditLogRequestSchema>;
type AuditLogSummaryRequest = z.infer<typeof AuditLogSummaryRequestSchema>;

const DEFAULT_AUDIT_LIMIT = AUDIT_LOG_DEFAULT_PAGE_SIZE;

type TResolvedAuditAccount = {
    id: string;
    account_name: string | null;
};

type TAggregatedAuditLoadResult = {
    resolvedAccounts: TResolvedAccounts;
    warnings: string[];
    filteredLogs: Record<string, unknown>[];
    sortOrder: 'asc' | 'desc';
    capped: boolean;
    requestOffset: number;
    nextOffset?: number;
};

export const getValidatedAuditLogArguments = (toolParams: ToolParams): AuditLogRequest => {
    return validateAuditLogRequest({
        duration: toolParams.arguments?.duration ?? 'P7D',
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope,
        message_contains: toolParams.arguments?.message_contains,
        token_contains: toolParams.arguments?.token_contains,
        account_name_contains: toolParams.arguments?.account_name_contains,
        allowed: toolParams.arguments?.allowed,
        acl: toolParams.arguments?.acl,
        include_actor_resolution: toolParams.arguments?.include_actor_resolution !== false,
        sort_order: toolParams.arguments?.sort_order ?? 'desc',
        pagination: {
            limit: toolParams.arguments?.limit,
            offset: toolParams.arguments?.offset
        }
    });
};

const validateAuditLogRequest = (request: ToolArguments): AuditLogRequest => {
    return parseToolArgsOrThrow(
        AuditLogRequestSchema,
        request,
        'Invalid audit log request'
    );
};

export const getValidatedAuditLogSummaryArguments = (toolParams: ToolParams): AuditLogSummaryRequest => {
    return parseToolArgsOrThrow(
        AuditLogSummaryRequestSchema,
        {
            duration: toolParams.arguments?.duration ?? 'P30D',
            top_n: toolParams.arguments?.top_n ?? 10,
            account_id: toolParams.arguments?.account_id,
            scope: toolParams.arguments?.scope,
            message_contains: toolParams.arguments?.message_contains,
            token_contains: toolParams.arguments?.token_contains,
            account_name_contains: toolParams.arguments?.account_name_contains,
            allowed: toolParams.arguments?.allowed,
            acl: toolParams.arguments?.acl,
            include_actor_resolution: toolParams.arguments?.include_actor_resolution !== false,
            sort_order: toolParams.arguments?.sort_order ?? 'desc',
            pagination: {
                limit: toolParams.arguments?.limit,
                offset: toolParams.arguments?.offset
            }
        },
        'Invalid audit log summary request'
    );
};

const includesIgnoreCase = (value: unknown, query: string) => 
    String(value || '').toLowerCase().includes(String(query || '').trim().toLowerCase())
;

const rankCounts = <T>(countsMap: Map<string, number>, formatter: (key: string, count: number) => T, topN: number): T[] => 
    Array.from(countsMap.entries())
        .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
        .slice(0, topN)
        .map(([key, count]) => formatter(key, count))
;

const getPrimaryUsernames = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache: Map<string, Promise<unknown>>
): Promise<Set<string>> => {
    try {
        const response = await memoizeRequest(cache, `audit-primary-usernames:${accountId}`, async () => {
            const { requestConfig, applyDataCallback } = getTokens(accountId);
            return makeRequest<Array<{ aname?: string | null; primary?: boolean | string; primary_aname?: string | null; }>>(requestConfig, authConfig, applyDataCallback);
        });

        const primaryTokens = Array.isArray(response)
            ? response.filter((token) => token?.primary === true || token?.primary === 'true')
            : [];

        return new Set(primaryTokens
            .map((token) => token?.aname || token?.primary_aname)
            .filter(Boolean)
            .map((value) => String(value).toLowerCase()));
    } catch {
        logger.warn(`[AUDIT LOGS] Unable to resolve primary users for account ${accountId} — actor resolution will be skipped`);
        return new Set();
    }
};

const resolveAuditToken = (entry: { raw_token?: string; token?: unknown; }, knownUsernames: Set<string>) => {
    const rawToken = entry.raw_token ?? '';
    if (rawToken && knownUsernames.has(rawToken.toLowerCase())) {
        return rawToken;
    }
    return entry.token;
};

const matchesAuditFilters = (entry: Record<string, unknown>, request: AuditLogRequest | AuditLogSummaryRequest) => {
    if (request.message_contains && !includesIgnoreCase(entry.message, request.message_contains)) {
        return false;
    }
    const tokenContains = request.token_contains;
    if (tokenContains) {
        const tokenCandidates = [entry.token, entry.raw_token];
        const matchesToken = tokenCandidates.some((candidate) => includesIgnoreCase(candidate, tokenContains));
        if (!matchesToken) {
            return false;
        }
    }
    if (request.account_name_contains && !includesIgnoreCase(entry.account_name, request.account_name_contains)) {
        return false;
    }
    if (request.allowed !== undefined && entry.allowed !== request.allowed) {
        return false;
    }
    if (request.acl && String(entry.acl || '').toLowerCase() !== String(request.acl).trim().toLowerCase()) {
        return false;
    }
    return true;
};

const getAccountAuditLogs = async (
    authConfig: IAuthConfig,
    account: TResolvedAuditAccount,
    request: AuditLogRequest | AuditLogSummaryRequest,
    cache: Map<string, Promise<unknown>>,
    startOffset = 0,
    maxMatchingRecords = AUDIT_LOG_FETCH_CAP
) => {
    const endTimeNow = new Date();
    const startTimeUTC = subtractPeriod(request.duration, endTimeNow);
    const body: IAuditLogBody = {
        account: account.id,
        from: startTimeUTC.toISOString(),
        to: endTimeNow.toISOString()
    };

    const fetchCap = AUDIT_LOG_FETCH_CAP;
    const upstreamPageSize = AUDIT_LOG_UPSTREAM_PAGE_SIZE;
    const rawLogs: IAuditLogRecord[] = [];
    const matchingRecordLimit = Math.min(Math.max(maxMatchingRecords, 1), fetchCap);
    let nextRequestOffset = startOffset;
    let nextOffset: number | undefined;
    let matchingLogCount = 0;
    let capped = false;
    let hasMoreUpstreamPages = false;

    while (rawLogs.length < fetchCap && matchingLogCount < matchingRecordLimit) {
        const remainingFetchCapacity = fetchCap - rawLogs.length;
        const remainingMatchCapacity = matchingRecordLimit - matchingLogCount;
        const pageLimit = Math.min(upstreamPageSize, remainingFetchCapacity, remainingMatchCapacity);
        const { requestConfig, applyDataCallback } = getAuditLogHistorySettings(body, {
            limit: pageLimit,
            offset: nextRequestOffset
        });

        const auditLogs = await makeRequest<ToolResult<AuditLogToolResponse>>(requestConfig, authConfig, applyDataCallback);
        const pageLogs = auditLogs.result?.auditLogs ?? [];

        if (!Array.isArray(pageLogs) || pageLogs.length === 0) {
            hasMoreUpstreamPages = false;
            break;
        }

        const acceptedPageLogs = pageLogs
            .slice(0, pageLimit)
            .map((entry) => ({
                ...entry,
                account_id: account.id,
                account_name: account.account_name
            }));
        rawLogs.push(...acceptedPageLogs);
        matchingLogCount += acceptedPageLogs.filter((entry) => matchesAuditFilters(entry, request)).length;

        const pageNextOffset = auditLogs.result?.pagination?.nextOffset;
        hasMoreUpstreamPages = auditLogs.result?.pagination?.hasMorePages === true && typeof pageNextOffset === 'number';
        nextOffset = hasMoreUpstreamPages ? pageNextOffset : undefined;

        if (!hasMoreUpstreamPages || typeof pageNextOffset !== 'number') {
            break;
        }

        if (matchingLogCount >= matchingRecordLimit || rawLogs.length >= fetchCap) {
            break;
        }

        nextRequestOffset = pageNextOffset;
    }

    if (rawLogs.length >= fetchCap && hasMoreUpstreamPages) {
        capped = true;
    }

    if (rawLogs.length === 0) {
        return { logs: [] as Record<string, unknown>[], capped: false };
    }

    const primaryUsernames = request.include_actor_resolution !== false
        ? await getPrimaryUsernames(authConfig, account.id, cache)
        : new Set<string>();

    return {
        logs: rawLogs.map((entry) => ({
            ...entry,
            token: request.include_actor_resolution !== false ? resolveAuditToken(entry, primaryUsernames) : entry.token
        })),
        capped,
        startOffset,
        nextOffset
    };
};

const loadFilteredAuditLogs = async (
    request: AuditLogRequest | AuditLogSummaryRequest,
    authConfig: IAuthConfig
): Promise<TAggregatedAuditLoadResult> => {
    const cache = createRequestCache();
    const resolvedAccounts = await getAccountsForScope(authConfig, {
        accountId: request.account_id,
        scope: request.scope,
        defaultScope: 'all',
        exactOnAccountId: true,
        cache
    });
    const warnings = [...resolvedAccounts.warnings];
    const allLogs: Record<string, unknown>[] = [];
    let capped = false;
    let nextOffset: number | undefined;
    const requestOffset = request.pagination?.offset ?? 0;
    const isMultiAccount = resolvedAccounts.accounts.length > 1;
    const requestedLimit = request.pagination?.limit ?? DEFAULT_AUDIT_LIMIT;
    const effectiveLimit = Math.min(Math.max(requestedLimit, 1), AUDIT_LOG_MAX_PAGE_SIZE);
    const perAccountMatchingLimit = isMultiAccount ? AUDIT_LOG_FETCH_CAP : effectiveLimit;

    if (isMultiAccount && requestOffset > 0) {
        throw new Error('offset pagination is only supported for single-account audit queries. Narrow the scope to one account or reset offset to 0.');
    }

    const accountOffsets = new Map<string, number>(
        resolvedAccounts.accounts.map((account) => [account.id, isMultiAccount ? 0 : requestOffset])
    );

    const results = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            const startOffset = accountOffsets.get(account.id) ?? 0;
            return {
                ...await getAccountAuditLogs(authConfig, account, request, cache, startOffset, perAccountMatchingLimit),
                accountId: account.id,
                warning: null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                logs: [] as Record<string, unknown>[],
                capped: false,
                nextOffset: undefined,
                accountId: account.id,
                warning: `Failed to load audit logs for account ${account.id}: ${message}`
            };
        }
    });

    for (const result of results) {
        allLogs.push(...result.logs || []);
        if (result.warning) {
            warnings.push(result.warning);
        }
        if (result.capped) {
            capped = true;
            warnings.push(`Audit retrieval for account ${result.accountId} reached the safety fetch cap of ${AUDIT_LOG_FETCH_CAP} records.`);
        }
        if (!isMultiAccount && typeof result.nextOffset === 'number') {
            nextOffset = result.nextOffset;
        }
    }

    const filteredLogs = allLogs.filter((entry) => matchesAuditFilters(entry, request));
    const sortOrder = request.sort_order || 'desc';
    filteredLogs.sort((left, right) => sortOrder === 'asc'
        ? String(left.time || '').localeCompare(String(right.time || ''))
            || String(left.account_id || '').localeCompare(String(right.account_id || ''))
            || String(left.message || '').localeCompare(String(right.message || ''))
        : String(right.time || '').localeCompare(String(left.time || ''))
            || String(left.account_id || '').localeCompare(String(right.account_id || ''))
            || String(left.message || '').localeCompare(String(right.message || '')));

    if (capped) {
        warnings.push(
            `Results were capped at ${AUDIT_LOG_FETCH_CAP} records for this request window. ` +
            'If all matching records are required, continue with nextOffset for a single-account query or narrow a broad query to one account.'
        );
    }

    return {
        resolvedAccounts,
        warnings,
        filteredLogs,
        sortOrder,
        capped,
        requestOffset,
        nextOffset
    };
};

export const getAuditLogHistory = async (
    request: AuditLogRequest,
    authConfig: IAuthConfig
): Promise<ToolResult<AuditLogToolResponse>> => {
    try {
        const requestedLimit = request.pagination?.limit ?? DEFAULT_AUDIT_LIMIT;
        const effectiveLimit = Math.min(Math.max(requestedLimit, 1), AUDIT_LOG_MAX_PAGE_SIZE);
        const { resolvedAccounts, warnings, filteredLogs, sortOrder, capped, requestOffset, nextOffset } = await loadFilteredAuditLogs(request, authConfig);
        const totalLogs = filteredLogs.length;
        const pagedLogs = filteredLogs.slice(0, effectiveLimit) as unknown as IAuditLogRecord[];
        const isMultiAccount = resolvedAccounts.accounts.length > 1;
        const hasMorePages = !isMultiAccount && nextOffset !== undefined;
        const hasAdditionalData = isMultiAccount
            ? capped || totalLogs > pagedLogs.length
            : hasMorePages;
        const continuationMessage = hasAdditionalData
            ? isMultiAccount
                ? `Audit history responses across multiple accounts are limited to ${AUDIT_LOG_FETCH_CAP} records per request and do not support continuation. Narrow the query to one account to continue beyond the current response window.`
                : `Audit history responses return at most ${AUDIT_LOG_FETCH_CAP} records per request. Repeat the same query with offset ${nextOffset} to continue if all matching records are required.`
            : undefined;
        const pagination: {
            hasMorePages: boolean;
            nextOffset?: number;
            totalInResponse: number;
            totalAvailable: number;
        } = {
            hasMorePages,
            totalInResponse: pagedLogs.length,
            totalAvailable: totalLogs
        };
        if (nextOffset !== undefined) {
            pagination.nextOffset = nextOffset;
        }

        return {
            result: {
                auditLogs: pagedLogs.map(({ raw_token: _raw, ...entry }) => entry as IAuditLogRecord),
                pagination
            },
            success: true,
            messages: [`Retrieved ${pagedLogs.length} audit log records`]
                .concat(continuationMessage ? [continuationMessage] : [])
                .concat(warnings),
            meta: {
                ...buildScopeMeta('get_audit_log_history', resolvedAccounts),
                duration: request.duration,
                sort_order: sortOrder,
                filtered_total_available: totalLogs,
                requested_limit: requestedLimit,
                effective_limit: effectiveLimit,
                fetch_cap: AUDIT_LOG_FETCH_CAP,
                request_offset: requestOffset,
                next_offset: nextOffset,
                response_capped: capped
            }
        } as ToolResult<AuditLogToolResponse>;
    } catch (error) {
        logger.error('[AUDIT LOGS] Error getting audit logs history:', error);
        throw error;
    }
};

export const getAuditLogSummary = async (
    request: AuditLogSummaryRequest,
    authConfig: IAuthConfig
): Promise<ToolResult<Record<string, unknown>>> => {
    try {
        const topN = Math.max(1, Math.min(Number(request.top_n) || 10, 25));
        const { resolvedAccounts, warnings, filteredLogs, sortOrder, capped } = await loadFilteredAuditLogs(request, authConfig);
        const windowEnd = new Date();
        const windowStart = subtractPeriod(request.duration, windowEnd);
        const accountCounts = new Map<string, number>();
        const messageCounts = new Map<string, number>();
        const actorCounts = new Map<string, number>();
        const ipCounts = new Map<string, number>();
        let allowedCount = 0;
        let deniedCount = 0;

        for (const entry of filteredLogs) {
            const accountKey = `${entry.account_id || ''}|${entry.account_name || ''}`;
            accountCounts.set(accountKey, (accountCounts.get(accountKey) || 0) + 1);
            messageCounts.set(String(entry.message || 'Unknown'), (messageCounts.get(String(entry.message || 'Unknown')) || 0) + 1);
            actorCounts.set(String(entry.token || 'Unknown'), (actorCounts.get(String(entry.token || 'Unknown')) || 0) + 1);
            if (entry['client-ip']) {
                const ipKey = String(entry['client-ip']);
                ipCounts.set(ipKey, (ipCounts.get(ipKey) || 0) + 1);
            }
            if (entry.allowed === true) {
                allowedCount += 1;
            }
            if (entry.allowed === false) {
                deniedCount += 1;
            }
        }

        return {
            result: {
                summary: {
                    total_events: filteredLogs.length,
                    unique_accounts: new Set(filteredLogs.map((entry) => entry.account_id).filter(Boolean)).size,
                    unique_ips: ipCounts.size,
                    allowed_count: allowedCount,
                    denied_count: deniedCount,
                    duration: request.duration,
                    window_start: windowStart.toISOString(),
                    window_end: windowEnd.toISOString(),
                    summary_capped: capped
                },
                accounts: rankCounts(accountCounts, (key, count) => {
                    const [account_id, account_name] = String(key).split('|');
                    return { account_id, account_name: account_name || null, count };
                }, topN),
                top_messages: rankCounts(messageCounts, (message, count) => ({ message, count }), topN),
                top_actors: rankCounts(actorCounts, (token, count) => ({ token, count }), topN),
                top_ips: rankCounts(ipCounts, (ip_address, count) => ({ ip_address, count }), topN)
            },
            success: true,
            messages: [`Generated audit log summary from ${filteredLogs.length} events`].concat(warnings),
            meta: {
                ...buildScopeMeta('get_audit_log_summary', resolvedAccounts),
                duration: request.duration,
                sort_order: sortOrder,
                top_n: topN
            }
        } as ToolResult<Record<string, unknown>>;
    } catch (error) {
        logger.error('[AUDIT LOGS] Error getting audit log summary:', error);
        throw error;
    }
};
