import { createToolErrorResponse, createToolResponse } from '../../../helpers/tool.helper.js';
import type { ToolHandlers, ToolMetadata } from '../../tools.interfaces.js';
import { getValidatedPmcToolArguments } from '../helpers/pmc-tool.helper.js';
import { PmcAuditLogHistorySchema } from '../schemas/pmc-audit-logs.schema.js';
import { getPmcAuditLogHistory } from './pmc-audit-logs-tools.helper.js';

export const PMC_AUDIT_LOGS_TOOLS_HANDLER: ToolHandlers = {
    pmc_get_audit_log_history: async (request, authConfig) => {
        try {
            const { customer_guid, timeRange } = getValidatedPmcToolArguments(
                request.params,
                PmcAuditLogHistorySchema
            );

            const { success, messages, result } = await getPmcAuditLogHistory(
                authConfig,
                timeRange,
                customer_guid
            );

            const metadata: ToolMetadata = {
                tool: 'pmc_get_audit_log_history',
                success,
                messages
            };

            const response = Array.isArray(result)
                ? { subaccounts: result }
                : result;

            return createToolResponse(response as unknown as Record<string, unknown>, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_audit_log_history', error);
        }
    }
};
