import { getDeviceMonitoringDiagram, getBackupSummarySettings, getAggregatedBackupSummarySettings, getAggregatedMonitoringDiagram } from '../../api/monitoring-api.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { logger } from '../../logger/logger.js';
import type { SnapshotCoverageHistoryRequestSchema, MonitoringBackupSummaryRequestSchema, MonitoringAggregatedBackupSummaryRequestSchema, AggregatedSnapshotCoverageHistoryRequestSchema } from '../../utils/schemas/requests/monitoring.schemas.js';
import type { z } from 'zod';

type SnapshotCoverageHistoryRequest = z.infer<typeof SnapshotCoverageHistoryRequestSchema>;
type AggregatedSnapshotCoverageHistoryRequest = z.infer<typeof AggregatedSnapshotCoverageHistoryRequestSchema>;
type MonitoringBackupSummaryRequest = z.infer<typeof MonitoringBackupSummaryRequestSchema>;
type MonitoringAggregatedBackupSummaryRequest = z.infer<typeof MonitoringAggregatedBackupSummaryRequestSchema>;

export const getSnapshotCoverageHistory = async (authConfig: IAuthConfig, request: SnapshotCoverageHistoryRequest) => {
    try {
        logger.info(`[MONITORING] Getting backup coverage history for ${request.guid}:`);

        const {
            guid: deviceId,
            ...restParams
        } = request;
        const { requestConfig, applyDataCallback } = getDeviceMonitoringDiagram(
            authConfig.keepitGuid,
            deviceId,
            'snapshot-coverage',
            restParams
        );
        const diagrams = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { diagrams },
            success: true,
            messages: ['Retrieved backup coverage history diargam data for each data area.']
        };
    } catch (error) {
        logger.error('[MONITORING] Error getting backup coverage history:', error);
        throw error;
    }
};

export const getAggregatedSnapshotCoverageHistory = async (authConfig: IAuthConfig, request: AggregatedSnapshotCoverageHistoryRequest) => {
    try {
        logger.info(`[MONITORING] Getting aggregated backup coverage history for ${request.type} connector type:`);

        const {
            ...restParams
        } = request;
        const { requestConfig, applyDataCallback } = getAggregatedMonitoringDiagram(
            authConfig.keepitGuid,
            restParams
        );
        const diagrams = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { diagrams },
            success: true,
            messages: ['Retrieved aggregated backup coverage history diargam data for each data area.']
        };
    } catch (error) {
        logger.error('[MONITORING] Error getting aggregated backup coverage history:', error);
        throw error;
    }
};

export const getBackupSummary = async (authConfig: IAuthConfig, request: MonitoringBackupSummaryRequest) => {
    try {
        logger.info(`[MONITORING] Getting backup summary data for ${request.guid}`);

        const { requestConfig, applyDataCallback } = getBackupSummarySettings(
            authConfig.keepitGuid,
            request.guid,
            { raw: request.raw }
        );
        const backupSummary = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...backupSummary },
            success: true,
            guid: request.guid,
            messages: ['Retrieved backup summary data']
        };
    } catch (error) {
        logger.error('[MONITORING] Error getting backup summary data:', error);
        throw error;
    }
};

export const getAggregatedBackupSummary = async (authConfig: IAuthConfig, params: MonitoringAggregatedBackupSummaryRequest) => {
    try {
        logger.info(`[MONITORING] Getting aggregated backup summary data for ${params?.type ?? 'all connectors'}`);

        const { requestConfig, applyDataCallback } = getAggregatedBackupSummarySettings(
            authConfig.keepitGuid,
            params
        );
        const backupSummary = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { 'backup-summary': backupSummary },
            success: true,
            messages: ['Retrieved aggregated backup summary data']
        };
    } catch (error) {
        logger.error('[MONITORING] Error getting aggregated backup summary data:', error);
        throw error;
    }
};
