import type {
    ConnectorHealthRequestSchema,
    ConnectorRsiSummaryRequestSchema,
    AggregatedConnectorHealthRequestSchema,
    AggregatedRsiSummaryRequestSchema
} from '../../utils/schemas/requests/connector.schemas.js';
import {
    getConnectorHealth,
    getConnectorRsiSummarySettings,
    getAggregatedConnectorsHealthSettings,
    getAggregatedRsiSummarySettings,
    getConnectors
} from '../../api/connectors-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { z } from 'zod';

type ConnectorHealthRequest = z.infer<typeof ConnectorHealthRequestSchema>;
type AggregatedConnectorHealthRequest = z.infer<typeof AggregatedConnectorHealthRequestSchema>;
type ConnectorRsiSummaryRequest = z.infer<typeof ConnectorRsiSummaryRequestSchema>;
type AggregatedRsiSummaryRequest = z.infer<typeof AggregatedRsiSummaryRequestSchema>;

export const fetchConnectors = async (authConfig: IAuthConfig) => {
    try {
        const { requestConfig, applyDataCallback } = getConnectors(authConfig.keepitGuid);
        const connectors = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { connectors },
            success: true,
            messages: [`Found ${connectors.length} connectors`]
        };
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors:', error);
        throw error;
    }
};

export const fetchConnectorHealth = async (authConfig: IAuthConfig, request: ConnectorHealthRequest) => {
    try {
        logger.info(`[CONNECTOR_HEALTH] Getting health for connector: ${request.guid}`);

        const { requestConfig, applyDataCallback } = getConnectorHealth(
            authConfig.keepitGuid,
            request.guid,
            {
                reason: request.reason ?? true
            }
        );
        const devHealth = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...devHealth },
            success: true,
            messages: [],
            guid: request.guid
        };
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors health:', error);
        throw error;
    }
};

export const getAggregatedConnectorsHealth = async (authConfig: IAuthConfig, requestParams: AggregatedConnectorHealthRequest) => {
    try {
        logger.info(`Getting aggregated health for ${requestParams?.type ?? 'all connectors'}`);

        const { requestConfig, applyDataCallback } = getAggregatedConnectorsHealthSettings(authConfig.keepitGuid, requestParams);
        const devHealth = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { devHealth },
            success: true,
            messages: [`Retrieved aggregated health data for ${requestParams?.type ?? 'all connectors'}`]
        };
    } catch (error) {
        logger.error('Error getting aggregated connectors health:', error);
        throw error;
    }
};

export const getConnectorRsiSummary = async (authConfig: IAuthConfig, request: ConnectorRsiSummaryRequest) => {
    try {
        const { requestConfig, applyDataCallback } = getConnectorRsiSummarySettings(authConfig.keepitGuid, request.guid);
        const rsiSummary = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...rsiSummary },
            success: true,
            messages: [],
            guid: request.guid
        };
    } catch (error) {
        logger.error('Error getting Recurrently skipped items:', error);
        throw error;
    }
};

export const getAggregatedRsiSummary = async (authConfig: IAuthConfig, requestParams?: AggregatedRsiSummaryRequest) => {
    try {
        const { requestConfig, applyDataCallback } = getAggregatedRsiSummarySettings(
            authConfig.keepitGuid,
            requestParams
        );
        const aggregatedRsiSummary = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...aggregatedRsiSummary },
            success: true,
            messages: ['Retrieved aggregated recurrently skipped items (RSI) data']
        };
    } catch (error) {
        logger.error('Error getting Aggregated recurrently skipped items:', error);
        throw error;
    }
};
