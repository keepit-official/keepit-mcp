import { createToolHandler } from '../../helpers/tool.helper.js';
import { getLatestSnapshotByGuid, handleGetSnapshotRange } from './snapshot-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import { LatestSnapshotRequestSchema, SnapshotRangeRequestSchema } from '../../utils/schemas/requests/snapshot.schemas.js';

export const SNAPSHOT_TOOLS_HANDLER: ToolHandlers = {
    get_latest_snapshot: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_latest_snapshot',
            toolRequest: request,
            toolHandler: getLatestSnapshotByGuid,
            validationSchema: LatestSnapshotRequestSchema,
            authConfig
        }),
    get_snapshot_range: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_snapshot_range',
            toolRequest: request,
            toolHandler: handleGetSnapshotRange,
            validationSchema: SnapshotRangeRequestSchema,
            authConfig
        })
};
