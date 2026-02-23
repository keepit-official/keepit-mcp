import { ConnectorHealthRequestSchema } from '../../utils/schemas/requests/connector.schemas.js';
import { getConnectorHealthSettings, getConnectorsSettings } from '../../api/connectors-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type ConnectorHealthRequest = z.infer<typeof ConnectorHealthRequestSchema>;

export const getValidatedConnectorHealthArguments = (toolParams: ToolParams): ConnectorHealthRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid
    };

    return validateConnectorHealthRequest(requestArguments);
};

const validateConnectorHealthRequest = (request: ToolArguments) => {
    const validationResult = ConnectorHealthRequestSchema.safeParse(request);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    return {
        guid: validationResult.data.guid
    };
};

export const getConnectors = async (authConfig: IAuthConfig): Promise<ToolResult<IConnector[]>> => {
    try {
        const { requestConfig, applyDataCallback } = getConnectorsSettings(authConfig.keepitGuid);
        const devices = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: devices,
            success: true,
            messages: [`Found ${devices.length} connectors`]
        };
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors:', error);
        throw error;
    }
};

export const getConnectorHealth = async (request: ConnectorHealthRequest, authConfig: IAuthConfig): Promise<string> => {
    try {
        logger.info(`[CONNECTOR_HEALTH] Getting health for connector: ${request.guid}`);

        const { requestConfig, applyDataCallback } = getConnectorHealthSettings(authConfig.keepitGuid, request.guid);
        const connectorHealth = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return connectorHealth;
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors health:', error);
        throw error;
    }
};
