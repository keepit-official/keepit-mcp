import { getConnectors } from '../../connector/connectors-tools.helper.js';
import { getLatestImportedSnapshot } from '../../../api/snapshot-api.js';
import { getDeviceStatus, getConnectorHealthSettings, getCriticalConnectorsSettings } from '../../../api/connectors-api.js';
import { makeRequest, MakeRequestErrorException } from '../../../helpers/make-request.helper.js';
import { logger } from '../../../logger/logger.js';
import { resolveCustomerAuthConfig } from '../../../helpers/auth-config.helper.js';
import { getConnectorFailureReason, getConnectorSolutionLink } from '../../../helpers/connector-status.helper.js';
import type { IAuthConfig } from '../../../helpers/auth-config.helper.js';
import type { ToolResult } from '../../tools.interfaces.js';

export const getSubaccountConnectorsHealthSummary = async (customerGuid: string, authConfig: IAuthConfig) => {
    try {
        const customerAuthConfig = resolveCustomerAuthConfig(customerGuid, authConfig);
        const { result: connectors } = await getConnectors(customerAuthConfig);

        const connectorsHealth = await Promise.all(
            connectors.map(async (connector) => {
                const { requestConfig: snapshotConfig, applyDataCallback: snapshotCb } = getLatestImportedSnapshot(customerGuid, connector.guid);
                const { requestConfig: statusConfig, applyDataCallback: statusCb } = getDeviceStatus(customerGuid, connector.guid);
                const { requestConfig: healthConfig, applyDataCallback: healthCb } = getConnectorHealthSettings(customerGuid, connector.guid);

                const [snapshotRaw, statusEntry, healthStatus] = await Promise.all([
                    // 404 means no snapshots exist yet for this connector — treat as no backup
                    makeRequest(snapshotConfig, customerAuthConfig, snapshotCb).catch((e: unknown) => {
                        if (e instanceof MakeRequestErrorException && e.code === 404) return null;
                        throw e;
                    }),
                    makeRequest(statusConfig, customerAuthConfig, statusCb),
                    makeRequest(healthConfig, customerAuthConfig, healthCb)
                ]);

                const ecode = statusEntry?.ecode;
                const isSforceApiLimit = connector.type === 'sforce' && statusEntry?.status === '7';
                const hasError = ecode || isSforceApiLimit;

                return {
                    ...connector,
                    lastBackupAt: snapshotRaw?.tstamp ?? '',
                    healthStatus,
                    ...hasError && { failureReason: getConnectorFailureReason(statusEntry, connector.type) }
                };
            })
        );

        logger.info(`[PMC_CONNECTORS_HEALTH] Retrieved health summary for ${connectorsHealth.length} connectors`);

        return { result: connectorsHealth, success: true, messages: ['Connectors health summary retrieved successfully'] };
    } catch (error) {
        logger.error('[PMC_CONNECTORS_HEALTH] Error getting connectors health summary:', error);
        throw error;
    }
};

export const getConnectorIssueSolution = async (customerGuid: string, connectorGuid: string, connectorType: string | undefined, authConfig: IAuthConfig) => {
    const customerAuthConfig = resolveCustomerAuthConfig(customerGuid, authConfig);

    const { requestConfig: statusConfig, applyDataCallback: statusCb } = getDeviceStatus(customerGuid, connectorGuid);
    const { requestConfig: healthConfig, applyDataCallback: healthCb } = getConnectorHealthSettings(customerGuid, connectorGuid);

    const [statusEntry, healthStatus] = await Promise.all([
        makeRequest(statusConfig, customerAuthConfig, statusCb),
        makeRequest(healthConfig, customerAuthConfig, healthCb)
    ]);

    if (healthStatus === 'healthy') {
        return { result: { healthStatus }, success: true, messages: [] };
    }

    const isSforceApiLimit = connectorType === 'sforce' && statusEntry?.status === '7';
    const ecode = isSforceApiLimit ? 'SFORCE_API_LIMIT' : statusEntry?.ecode;
    const failureReason = getConnectorFailureReason(statusEntry, connectorType as TCloudType);
    const solutionUrl = getConnectorSolutionLink(ecode ?? '', connectorType as TCloudType | undefined);

    return { result: { healthStatus, failureReason, solutionUrl }, success: true, messages: [] };
};

export const getAllCriticalConnectors = async (
    authConfig: IAuthConfig
): Promise<ToolResult<{ disclaimer: string; connectors: ICriticalConnector[]; }>> => {
    const DISCLAIMER = '⚠️ This data may not be fully real-time.';
    try {
        const { requestConfig, applyDataCallback } = getCriticalConnectorsSettings(authConfig.keepitGuid);
        const attributeMaps = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const connectorResults = await Promise.all(
            attributeMaps.map(async (attrs) => {
                try {
                    const customerAuthConfig = resolveCustomerAuthConfig(attrs['account-guid'], authConfig);
                    const { requestConfig: statusConfig, applyDataCallback: statusCb } = getDeviceStatus(attrs['account-guid'], attrs['device-guid']);
                    const statusEntry = await makeRequest(statusConfig, customerAuthConfig, statusCb);

                    return {
                        'device-guid': attrs['device-guid'],
                        'device-name': attrs['device-name'],
                        'device-type': attrs['device-type'],
                        'account-guid': attrs['account-guid'],
                        'account-name': attrs['account-name'],
                        'account-email': attrs['account-email'],
                        'account-company': attrs['account-company'],
                        failureReason: getConnectorFailureReason(statusEntry, attrs['device-type'] as TCloudType)
                    };
                } catch (error: unknown) {
                    // The critical connectors table may be stale — skip devices that no longer exist
                    if (error instanceof MakeRequestErrorException && error.code === 404) {
                        logger.info(`[PMC_CRITICAL_CONNECTORS] Device ${attrs['device-guid']} not found (404), skipping`);
                        return null;
                    }
                    throw error;
                }
            })
        );

        const connectors = connectorResults.filter(Boolean) as ICriticalConnector[];

        logger.info(`[PMC_CRITICAL_CONNECTORS] Found ${connectors.length} critical connector(s)`);

        return {
            result: { disclaimer: DISCLAIMER, connectors },
            success: true,
            messages: [DISCLAIMER, `Found ${connectors.length} critical connector(s) across all subaccounts`]
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : (error as { message?: string; }).message ?? 'Unknown error';
        logger.error('[PMC_CRITICAL_CONNECTORS] Error fetching critical connectors:', message);
        throw new Error(message);
    }
};
