import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createToolHandler } from '../../helpers/tool.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import {
    getSnapshotCoverageHistory,
    getBackupSummary,
    getAggregatedBackupSummary,
    getAggregatedSnapshotCoverageHistory
} from './monitoring-tools-helper.js';
import {
    SnapshotCoverageHistoryRequestSchema,
    MonitoringBackupSummaryRequestSchema,
    MonitoringAggregatedBackupSummaryRequestSchema,
    AggregatedSnapshotCoverageHistoryRequestSchema
} from '../../utils/schemas/requests/monitoring.schemas.js';

export const MONITORING_TOOLS_HANDLER: ToolHandlers = {
    get_backup_coverage_history: async (request: CallToolRequest, authConfig) =>
        createToolHandler({
            toolName: 'get_backup_coverage_history',
            toolRequest: request,
            toolHandler: getSnapshotCoverageHistory,
            validationSchema: SnapshotCoverageHistoryRequestSchema,
            authConfig
        }),
    get_aggregated_backup_coverage_history: async (request: CallToolRequest, authConfig) =>
        createToolHandler({
            toolName: 'get_aggregated_backup_coverage_history',
            toolRequest: request,
            toolHandler: getAggregatedSnapshotCoverageHistory,
            validationSchema: AggregatedSnapshotCoverageHistoryRequestSchema,
            authConfig
        }),
    get_backup_summary: async (request: CallToolRequest, authConfig) =>
        createToolHandler({
            toolName: 'get_backup_summary',
            toolRequest: request,
            toolHandler: getBackupSummary,
            validationSchema: MonitoringBackupSummaryRequestSchema,
            authConfig
        }),
    get_aggregated_backup_summary: async (request: CallToolRequest, authConfig) =>
        createToolHandler({
            toolName: 'get_aggregated_backup_summary',
            toolRequest: request,
            toolHandler: getAggregatedBackupSummary,
            validationSchema: MonitoringAggregatedBackupSummaryRequestSchema,
            authConfig
        })
};
