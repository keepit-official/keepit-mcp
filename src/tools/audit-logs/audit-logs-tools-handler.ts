import { getValidatedAuditLogArguments, getValidatedAuditLogSummaryArguments, getAuditLogHistory, getAuditLogSummary } from './audit-logs-tools.helper.js';
import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

export const AUDIT_LOGS_TOOLS_HANDLER: ToolHandlers = {
    get_audit_log_history: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedAuditLogArguments(request.params);

            const { success, messages, result } = await getAuditLogHistory(
                toolArguments,
                authConfig
            );

            const metadata: ToolMetadata = {
                tool: 'get_audit_log_history',
                success,
                messages,
                recordCount: result.auditLogs.length
            };

            return createToolResponse<AuditLogToolResponse>(
                result,
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_audit_log_history', error);
        }
    },
    get_audit_log_summary: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedAuditLogSummaryArguments(request.params);
            const { success, messages, result } = await getAuditLogSummary(toolArguments, authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_audit_log_summary',
                success,
                messages
            };

            return createToolResponse<Record<string, unknown>>(result, metadata);
        } catch (error) {
            return createToolErrorResponse('get_audit_log_summary', error);
        }
    }
};
