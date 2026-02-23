import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import { getLatestSnapshotByGuid, getValidatedLatestSnapshotArgs, getValidatedSnapshotRangeArgs, handleGetSnapshotRange } from './snapshot-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { IDeviceSnapshot, ISnapshotRange } from '../../api/api-types/snapshot-api.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces.js';

type ConnectorsToolResponse = Record<'snapshot', IDeviceSnapshot | null>;
type RangeToolResponse = Record<'snapshots', ISnapshotRange[]>;

export const SNAPSHOT_TOOLS_HANDLER: ToolHandlers = {
    get_latest_snapshot: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const { guid } = getValidatedLatestSnapshotArgs(request.params);

            const { result: snapshot, success, messages } = await getLatestSnapshotByGuid(
                guid,
                authConfig
            );

            const metadata: ToolMetadata = {
                tool: 'get_latest_snapshot',
                success,
                messages,
                guid
            };

            return createToolResponse<ConnectorsToolResponse>(
                { snapshot },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_latest_snapshot', error);
        }
    },

    get_snapshot_range: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedSnapshotRangeArgs(request.params);

            const { result: snapshots, success, messages } = await handleGetSnapshotRange(toolArguments, authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_snapshot_range',
                success,
                messages,
                snapshotCount: snapshots.length
            };

            return createToolResponse<RangeToolResponse>(
                { snapshots },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_snapshot_range', error);
        }
    }
};
