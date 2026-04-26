import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import { findConnectors, getConnectorHealth, getValidatedConnectorHealthArguments, getValidatedConnectorListArguments, getConnectors } from './connectors-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces.js';

type ConnectorsToolResponse = Record<'connectors', IConnector[]>;
type HealthToolResponse = { connector: IConnector; health: string; };

export const CONNECTOR_TOOLS_HANDLER: ToolHandlers = {
    get_cloud_connectors: async (_, authConfig) => {
        try {
            const toolArguments = getValidatedConnectorListArguments(_.params);
            const { success, messages, result: connectors } = await getConnectors(authConfig, toolArguments);

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
    find_connector: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedConnectorListArguments(request.params);
            const { success, messages, result: connectors } = await findConnectors(authConfig, {
                ...toolArguments,
                query: request.params.arguments?.query as string | undefined
            });

            const metadata: ToolMetadata = {
                tool: 'find_connector',
                success,
                messages
            };

            return createToolResponse<ConnectorsToolResponse>({ connectors }, metadata);
        } catch (error) {
            return createToolErrorResponse('find_connector', error);
        }
    },

    get_connector_health: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedConnectorHealthArguments(request.params);
            const { connector, health } = await getConnectorHealth(toolArguments, authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_connector_health',
                success: true,
                guid: connector.guid,
                account_id: connector.account_id
            };

            return createToolResponse<HealthToolResponse>(
                { connector, health },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_connector_health', error);
        }
    }
};
