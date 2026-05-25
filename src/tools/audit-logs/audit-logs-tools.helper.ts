import { AuditLogRequestSchema } from '../../utils/schemas/requests/audit-log.schemas.js';
import { getAuditLogHistorySettings } from '../../api/audit-logs-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { parseToolArgsOrThrow } from '../../helpers/tool.helper.js';
import { subtractPeriod } from '../../helpers/date.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type AuditLogRequest = z.infer<typeof AuditLogRequestSchema>;

export const getValidatedAuditLogArguments = (toolParams: ToolParams): AuditLogRequest => {
    const requestArguments = {
        duration: toolParams.arguments?.duration,
        pagination: {
            limit: toolParams.arguments?.limit,
            offset: toolParams.arguments?.offset
        }
    };

    return validateAuditLogRequest(requestArguments);
};

const validateAuditLogRequest = (request: ToolArguments) => {
    return parseToolArgsOrThrow(
        AuditLogRequestSchema,
        request,
        'Invalid audit log request'
    );
};

export const getAuditLogHistory = async (
    request: AuditLogRequest,
    authConfig: IAuthConfig
): Promise<ToolResult<AuditLogToolResponse>> => {
    try {
        const endTimeNow = new Date();
        const startTimeUTC = subtractPeriod(request.duration, endTimeNow);

        const body: IAuditLogBody = {
            account: authConfig.keepitGuid,
            from: startTimeUTC.toISOString(),
            to: endTimeNow.toISOString()
        };

        const { requestConfig, applyDataCallback } = getAuditLogHistorySettings(body, request.pagination);
        const auditLogs = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return auditLogs;
    } catch (error) {
        logger.error('[AUDIT LOGS] Error getting audit logs history:', error);
        throw error;
    }
};
