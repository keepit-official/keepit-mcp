import { getAuditLogHistory } from './audit-logs-tools.helper.js';
import { createToolHandler } from '../../helpers/tool.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { AuditLogRequestSchema } from '../../utils/schemas/requests/audit-log.schemas.js';

export const AUDIT_LOGS_TOOLS_HANDLER: ToolHandlers = {
    get_audit_log_history: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'get_audit_log_history',
            toolRequest: request,
            toolHandler: getAuditLogHistory,
            validationSchema: AuditLogRequestSchema,
            authConfig
        })
};
