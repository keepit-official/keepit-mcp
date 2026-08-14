import { createToolHandler } from '../../helpers/tool.helper.js';
import {
    fetchConnectorHealth,
    getConnectorRsiSummary,
    getAggregatedConnectorsHealth,
    getAggregatedRsiSummary,
    fetchConnectors
} from './connectors-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import {
    ConnectorHealthRequestSchema,
    ConnectorRsiSummaryRequestSchema,
    AggregatedConnectorHealthRequestSchema,
    AggregatedRsiSummaryRequestSchema
} from '../../utils/schemas/requests/connector.schemas.js';

export const CONNECTOR_TOOLS_HANDLER: ToolHandlers = {
    get_cloud_connectors: async (_, authConfig) => 
        createToolHandler({
            toolName: 'get_cloud_connectors',
            toolHandler: fetchConnectors,
            authConfig
        }),
    get_connector_health: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_connector_health',
            toolRequest: request,
            toolHandler: fetchConnectorHealth,
            validationSchema: ConnectorHealthRequestSchema,
            authConfig
        }),
    get_aggregated_connector_health: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_aggregated_connector_health',
            toolRequest: request,
            toolHandler: getAggregatedConnectorsHealth,
            validationSchema: AggregatedConnectorHealthRequestSchema,
            authConfig
        }),
    get_connector_rsi_summary: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_connector_rsi_summary',
            toolRequest: request,
            toolHandler: getConnectorRsiSummary,
            validationSchema: ConnectorRsiSummaryRequestSchema,
            authConfig
        }),
    get_aggregated_rsi_summary: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_aggregated_rsi_summary',
            toolRequest: request,
            toolHandler: getAggregatedRsiSummary,
            validationSchema: AggregatedRsiSummaryRequestSchema,
            authConfig
        })
};
