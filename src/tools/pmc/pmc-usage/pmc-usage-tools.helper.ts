import { putUserExpirationsSettings, putTotalUserUsage, putMaxUsage, putUserUsageHistory, WORKLOAD_TYPES } from '../../../api/seat-limit-api.js';
import { logger } from '../../../logger/logger.js';
import { makeRequest } from '../../../helpers/make-request.helper.js';
import { normalizeArrayResponse } from '../../../helpers/fetch.helper.js';
import type { IAuthConfig } from '../../../helpers/auth-config.helper.js';
import type { ToolResult } from '../../tools.interfaces.js';
import { resourceToConnectorMap, connectorDisplayNames, resourcesTableTranslations } from './pmc-usage.constants.js';

type SeatLimitToolResult = ToolResult<ISeatLimitAccount[]>;

const isWorkloadType = (value: string): value is TWorkloadsType => {
    return (WORKLOAD_TYPES as readonly string[]).includes(value);
};

const mapResource = (
    connectorType: TWorkloadsType,
    raw: ISeatLimitResourceRaw,
    nowTimestamp: number
): ISeatLimitViolation => {
    const graceExpiresTimestamp = Date.parse(raw['grace-expires']);
    const isValidDate = !isNaN(graceExpiresTimestamp);

    return {
        name: connectorType,
        resource_name: raw.name,
        'readable-name': raw['readable-name'],
        limit: raw.limit,
        usage: raw.usage,
        overage: raw.usage - raw.limit,
        'grace-expires': isValidDate ? new Date(graceExpiresTimestamp).toISOString() : null,
        isGraceExpired: isValidDate && graceExpiresTimestamp < nowTimestamp
    };
};

const mapAccount = (
    raw: ISeatLimitAccountRaw,
    nowTimestamp: number,
    connectorTypesFilter?: readonly TWorkloadsType[]
): ISeatLimitAccount => {
    const resourceGroups = normalizeArrayResponse(
        raw['resources-violation']?.['resource-group']
    );

    const violations: ISeatLimitViolation[] = resourceGroups.flatMap(group => {
        const connectorType = group.name;
        if (!isWorkloadType(connectorType) || connectorTypesFilter?.length && !connectorTypesFilter.includes(connectorType)) {
            return [];
        }

        const resources = normalizeArrayResponse(group.resources?.resource);
        return resources.map(resource => mapResource(connectorType, resource, nowTimestamp));
    });

    return {
        guid: raw.guid,
        email: raw.email,
        company_name: raw.company_name,
        type: raw.type,
        'resources-violation': violations
    };
};

export const getSubaccountsExceedingSeatLimit = async (
    authConfig: IAuthConfig,
    connectorTypes?: TWorkloadsType[]
): Promise<SeatLimitToolResult> => {
    try {
        const { requestConfig, applyDataCallback } = putUserExpirationsSettings(authConfig.keepitGuid, connectorTypes);
        const rawAccounts = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const now = Date.now();
        const accounts = rawAccounts
            .map(raw => mapAccount(raw, now, connectorTypes))
            .filter(account => account['resources-violation'].length > 0);

        return {
            result: accounts,
            success: true,
            messages: [`Found ${accounts.length} account(s) exceeding seat limits`]
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : (error as { message?: string; }).message ?? 'Unknown error';
        logger.error('[SEAT_LIMITS] Error getting subaccounts exceeding seat limit:', message);
        throw new Error(message);
    }
};

const SEAT_TYPES: TSeatType[] = ['full', 'light', 'faculty', 'student'];

const deriveSeatType = (name: string): TSeatType | undefined => {
    const suffix = name.split('-').pop() as TSeatType;
    return SEAT_TYPES.includes(suffix) ? suffix : undefined;
};

const mapHistoryResource = (raw: IUsageHistoryResourceRaw): IUsageHistoryResource => {
    const aggregatedRaw = normalizeArrayResponse(raw['aggregated-on']?.resource);
    return {
        name: raw.name,
        readableName: resourcesTableTranslations[raw.name],
        usage: raw.usage,
        seatType: deriveSeatType(raw.name),
        ...aggregatedRaw.length > 0 && {
            'aggregated-on': aggregatedRaw.map(r => ({
                name: r.name,
                readableName: resourcesTableTranslations[r.name],
                usage: r.usage
            }))
        }
    };
};

export const getSubaccountSeatUsageHistory = async (
    authConfig: IAuthConfig,
    subaccountId: string,
    timeRange: { from: string; to: string; }
): Promise<ToolResult<IUsageHistorySnapshot[]>> => {
    try {
        const chunks = splitDateRange(timeRange.from, timeRange.to, 7);
        const chunkResults = await Promise.all(
            chunks.map(chunk => {
                const { requestConfig, applyDataCallback } = putUserUsageHistory(subaccountId, chunk);
                return makeRequest(requestConfig, authConfig, applyDataCallback);
            })
        );

        const snapshotsRaw = chunkResults.flat();
        const snapshots: IUsageHistorySnapshot[] = snapshotsRaw
            .map(snapshot => ({
                time: snapshot.time,
                resources: normalizeArrayResponse(snapshot.resources?.resource).map(mapHistoryResource)
            }))
            .sort((a, b) => a.time.localeCompare(b.time));

        logger.info(`[SEAT_USAGE_HISTORY] Retrieved ${snapshots.length} snapshot(s) for subaccount ${subaccountId}`);

        return {
            result: snapshots,
            success: true,
            messages: [`Retrieved ${snapshots.length} snapshot(s) for subaccount ${subaccountId}`]
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : (error as { message?: string; }).message ?? 'Unknown error';
        logger.error('[SEAT_USAGE_HISTORY] Error getting seat usage history:', message);
        throw new Error(message);
    }
};

const splitDateRange = (from: string, to: string, chunkDays = 2): Array<{ from: string; to: string; }> => {
    const chunks: Array<{ from: string; to: string; }> = [];
    let chunkStart = new Date(from);
    const end = new Date(to);

    while (chunkStart < end) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays);

        chunks.push({
            from: chunkStart.toISOString(),
            to: (chunkEnd < end ? chunkEnd : end).toISOString()
        });

        chunkStart = new Date(chunkEnd < end ? chunkEnd : end);
    }

    return chunks;
};

const mapResources = (resourcesRaw: IMaxUsageResourceRaw[]): ISeatAllocationItem[] =>
    resourcesRaw
        .filter(resource => resource.name.endsWith('-seats-total') && resource['maximum-usage'] > 0)
        .map(raw => {
            return {
                connectorType: resourceToConnectorMap[raw.name] ?? raw.name,
                connector: resourceToConnectorMap[raw.name] ? connectorDisplayNames[resourceToConnectorMap[raw.name]] ?? null : null,
                'max-usage': raw['maximum-usage']
            };
        });

type AllocationChunk = {
    total: ITotalUsageRaw;
    resources: IMaxUsageResourceRaw[];
};

const aggregateAllocationChunks = (chunks: AllocationChunk[]): AllocationChunk => {
    const result = chunks.reduce<{
        total: ITotalUsageRaw;
        resourceMaxMap: Map<string, IMaxUsageResourceRaw>;
    }>((acc, chunk) => {
        acc.total['connectors-count'] = Math.max(acc.total['connectors-count'], chunk.total['connectors-count']);
        acc.total['seats-count'] = Math.max(acc.total['seats-count'], chunk.total['seats-count']);
        acc.total['account-type'] = chunk.total['account-type'];

        chunk.resources.forEach((resource) => {
            const existing = acc.resourceMaxMap.get(resource.name);
            if (!existing || resource['maximum-usage'] > existing['maximum-usage']) {
                acc.resourceMaxMap.set(resource.name, resource);
            }
        });
        return acc;
    }, {
        total: {
            'connectors-count': 0,
            'seats-count': 0,
            'account-type': chunks[0].total['account-type']
        },
        resourceMaxMap: new Map<string, IMaxUsageResourceRaw>()
    });

    return {
        total: result.total,
        resources: [...result.resourceMaxMap.values()]
    };
};

export const getSeatAllocation = async (
    authConfig: IAuthConfig,
    timeRange: { from: string; to: string; },
    subaccountId?: string
): Promise<ToolResult<ISeatAllocationResult>> => {
    try {
        const userId = subaccountId ?? authConfig.keepitGuid;
        const chunks = splitDateRange(timeRange.from, timeRange.to);

        logger.info(`[SEAT_ALLOCATION] Fetching allocation for account ${userId} in ${chunks.length} chunk(s)`);

        const chunkResults = await Promise.all(
            chunks.map(async chunk => {
                const { requestConfig: totalConfig, applyDataCallback: totalCallback } = putTotalUserUsage(userId, chunk);
                const { requestConfig: maxUsageConfig, applyDataCallback: maxUsageCallback } = putMaxUsage(userId, chunk);

                const [total, resources] = await Promise.all([
                    makeRequest(totalConfig, authConfig, totalCallback),
                    makeRequest(maxUsageConfig, authConfig, maxUsageCallback)
                ]);

                return { total, resources };
            })
        );

        const { total: totalRaw, resources: resourcesRaw } = aggregateAllocationChunks(chunkResults);

        logger.info(`[SEAT_ALLOCATION] Retrieved seats allocation for account with ID: ${userId} - active connector(s): ${totalRaw['connectors-count']}, seat usage: ${totalRaw['seats-count']}`);

        return {
            result: {
                total: {
                    'connectors-count': totalRaw['connectors-count'],
                    'seats-count': totalRaw['seats-count'],
                    'account-type': totalRaw['account-type']
                },
                allocation: mapResources(resourcesRaw)
            },
            success: true,
            messages: [`Retrieved seats allocation for account with ID: ${userId} - active connector(s): ${totalRaw['connectors-count']}, seat usage: ${totalRaw['seats-count']}`]
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : (error as { message?: string; }).message ?? 'Unknown error';
        logger.error('[SEAT_ALLOCATION] Error getting seats allocation:', message);
        throw new Error(message);
    }
};
