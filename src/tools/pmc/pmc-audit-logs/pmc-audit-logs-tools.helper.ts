import { getAuditLogHistorySettings } from '../../../api/audit-logs-api.js';
import { logger } from '../../../logger/logger.js';
import { makeRequest } from '../../../helpers/make-request.helper.js';
import type { IAuthConfig } from '../../../helpers/auth-config.helper.js';
import type { ToolResult } from '../../tools.interfaces.js';

const getNextOffset = (pagination: AuditLogToolResponse['pagination'], currentOffset: number): number | undefined => {
    return pagination?.hasMorePages && pagination.nextOffset !== undefined && pagination.nextOffset > currentOffset
        ? pagination.nextOffset
        : undefined;
};

const fetchAuditLogPage = async (
    body: IAuditLogBody,
    authConfig: IAuthConfig,
    offset = 0
): Promise<ToolResult<AuditLogToolResponse>> => {
    const { requestConfig, applyDataCallback } = getAuditLogHistorySettings(body, { offset });
    requestConfig.headers = {
        'Content-Type': 'application/xml',
        'Accept': 'application/vnd.keepit.v3+xml'
    };
    return makeRequest(requestConfig, authConfig, applyDataCallback);
};

const collectAuditLogs = async (
    body: IAuditLogBody,
    authConfig: IAuthConfig,
    offset = 0
): Promise<IAuditLogRecord[]> => {
    const { result } = await fetchAuditLogPage(body, authConfig, offset);
    const nextOffset = getNextOffset(result.pagination, offset);

    if (nextOffset === undefined) {
        return result.auditLogs;
    }

    result.auditLogs.push(...await collectAuditLogs(body, authConfig, nextOffset));
    return result.auditLogs;
};

export const getPmcAuditLogHistory = async (
    authConfig: IAuthConfig,
    timeRange: { from: string; to: string; },
    customerGuid?: string
): Promise<ToolResult<IAuditLogSubaccountGroup | IAuditLogSubaccountGroup[]>> => {
    try {
        const accountId = customerGuid ?? authConfig.keepitGuid;
        const body: IAuditLogBody = {
            account: accountId,
            from: timeRange.from,
            to: timeRange.to,
            ...!customerGuid && { recursive: 'true' }
        };

        const auditLogs = await collectAuditLogs(body, authConfig);

        if (customerGuid) {
            logger.info(`[PMC_AUDIT_LOG] Retrieved ${auditLogs.length} audit log record(s) for subaccount ${customerGuid}`);
            return {
                result: { account: customerGuid, auditLogs },
                success: true,
                messages: [`Retrieved ${auditLogs.length} audit log record(s) for subaccount ${customerGuid}`]
            };
        }

        const grouped = auditLogs.reduce<Record<string, IAuditLogRecord[]>>((acc, record) => {
            const key = record.account ?? accountId;
            acc[key] ??= [];
            acc[key].push(record);
            return acc;
        }, {});

        const subaccounts: IAuditLogSubaccountGroup[] = Object.entries(grouped).map(
            ([id, accountAuditLogs]) => ({ account: id, auditLogs: accountAuditLogs })
        );

        logger.info(`[PMC_AUDIT_LOG] Retrieved audit logs for ${subaccounts.length} subaccount(s)`);
        return {
            result: subaccounts,
            success: true,
            messages: [`Retrieved audit logs for ${subaccounts.length} subaccount(s)`]
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : (error as { message?: string; }).message ?? 'Unknown error';
        logger.error('[PMC_AUDIT_LOG] Error getting audit log history:', message);
        throw new Error(message);
    }
};
