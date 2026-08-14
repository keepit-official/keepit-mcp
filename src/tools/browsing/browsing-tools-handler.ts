import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { createToolHandler } from '../../helpers/tool.helper.js';
import { ItemVersionsRequestSchema, SearchSnapshotDataRequestSchema } from '../../utils/schemas/requests/bsearch.schemas.js';
import { fetchBsearchSearchRequest, getItemVersions } from './browsing-tools-helper.js';

export const BROWSING_TOOLS_HANDLER: ToolHandlers = {
    search_snapshot_data: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'search_snapshot_data',
            toolRequest: request,
            toolHandler: fetchBsearchSearchRequest,
            validationSchema: SearchSnapshotDataRequestSchema,
            authConfig
        }),
    get_item_versions_history: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'get_item_versions_history',
            toolRequest: request,
            toolHandler: getItemVersions,
            validationSchema: ItemVersionsRequestSchema,
            authConfig
        })
};
