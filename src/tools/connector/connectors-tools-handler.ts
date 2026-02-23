import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import { getConnectorHealth, getValidatedConnectorHealthArguments, getConnectors } from './connectors-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces.js';

type ConnectorsToolResponse = Record<'connectors', IConnector[]>;
type HealthToolResponse = Record<'health', string>;

export const CONNECTOR_TOOLS_HANDLER: ToolHandlers = {
    get_cloud_connectors: async (_, authConfig) => {
        try {
            const { success, messages, result: connectors } = await getConnectors(authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_cloud_connectors',
                success,
                messages
            };

            return createToolResponse<ConnectorsToolResponse>(
                { connectors },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_cloud_connectors', error);
        }
    },

    get_connector_health: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedConnectorHealthArguments(request.params);
            const health = await getConnectorHealth(toolArguments, authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_connector_health',
                success: true,
                guid: toolArguments.guid
            };

            return createToolResponse<HealthToolResponse>(
                { health },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_connector_health', error);
        }
    }
};
