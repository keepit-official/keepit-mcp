import type { AuditLogRequestSchema } from '../../utils/schemas/requests/audit-log.schemas.js';
import { getAuditLogHistorySettings } from '../../api/audit-logs-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { subtractPeriod } from '../../helpers/date.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type AuditLogRequest = z.infer<typeof AuditLogRequestSchema>;

export const getAuditLogHistory = async (
    authConfig: IAuthConfig,
    request: AuditLogRequest
): Promise<ToolResult<AuditLogToolResponse>> => {
    try {
        const { duration, ...pagination } = request;
        const endTimeNow = new Date();
        const startTimeUTC = subtractPeriod(duration, endTimeNow);

        const body: IAuditLogBody = {
            account: authConfig.keepitGuid,
            from: startTimeUTC.toISOString(),
            to: endTimeNow.toISOString()
        };

        const { requestConfig, applyDataCallback } = getAuditLogHistorySettings(body, pagination);
        const auditLogs = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return auditLogs;
    } catch (error) {
        logger.error('[AUDIT LOGS] Error getting audit logs history:', error);
        throw error;
    }
};
