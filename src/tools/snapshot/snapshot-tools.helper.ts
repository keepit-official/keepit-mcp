/**
 * Snapshot tool orchestration layer.
 *
 * This module validates snapshot arguments, resolves the target connector, and
 * adapts low-level snapshot endpoint responses into the MCP tool result shape.
 */
import { getLatestSnapshot, getSnapshotRange } from '../../api/snapshot-api.js';
import { LatestSnapshotRequestSchema, SnapshotRangeRequestSchema } from '../../utils/schemas/requests/snapshot.schemas.js';
import { logger } from './../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { validateAndSanitizeConnectorId } from '../../utils/sanitizers/connector-id.sanitizer.js';
import { resolveScopedConnector } from '../connector/connectors-tools.helper.js';
import type { IDeviceSnapshot, ISnapshotRange } from '../../api/api-types/snapshot-api.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

type LatestSnapshotRequest = z.infer<typeof LatestSnapshotRequestSchema>;
type SnapshotRangeRequest = z.infer<typeof SnapshotRangeRequestSchema>;

export const getValidatedLatestSnapshotArgs = (toolParams: ToolParams): LatestSnapshotRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid,
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope
    };

    return validateLatestSnapshotRequest(requestArguments);
};

export const getValidatedSnapshotRangeArgs = (toolParams: ToolParams): SnapshotRangeRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid,
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope,
        startTime: toolParams.arguments?.startTime ?? new Date().toISOString(),
        timespan: toolParams.arguments?.timespan ?? 'P7D',
        reverse: toolParams.arguments?.reverse ?? true,
        count: toolParams.arguments?.count
    };

    return validateSnapshotRangeRequest(requestArguments);
};

export const validateLatestSnapshotRequest = (args: ToolArguments): LatestSnapshotRequest => {
    const validationResult = LatestSnapshotRequestSchema.safeParse(args);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => {
            const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
            return `${path}${err.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    return {
        guid: validateAndSanitizeConnectorId(validationResult.data.guid),
        account_id: validationResult.data.account_id,
        scope: validationResult.data.scope
    };
};

export const validateSnapshotRangeRequest = (args: ToolArguments): SnapshotRangeRequest => {
    const validationResult = SnapshotRangeRequestSchema.safeParse(args);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => {
            const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
            return `${path}${err.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    const { guid, account_id, scope, startTime, timespan, reverse, count } = validationResult.data;

    const validatedConnectorId = validateAndSanitizeConnectorId(guid);
    const validatedTimespan = timespan.toUpperCase();

    return {
        guid: validatedConnectorId,
        account_id,
        scope,
        startTime,
        timespan: validatedTimespan,
        reverse,
        count
    };
};

export const getLatestSnapshotByGuid = async (request: LatestSnapshotRequest, authConfig: IAuthConfig): Promise<ToolResult<IDeviceSnapshot | null>> => {
    try {
        const connector = await resolveScopedConnector({
            guid: request.guid,
            account_id: request.account_id,
            scope: request.scope
        }, authConfig);
        const {
            requestConfig,
            applyDataCallback
        } = getLatestSnapshot(connector.account_id, connector.guid);

        const latestSnapshot = await makeRequest(requestConfig, authConfig, applyDataCallback);

        if (!latestSnapshot) {
            throw new Error(`No latest snapshot found for connector ${connector.guid}`);
        }

        return {
            result: latestSnapshot,
            success: true,
            messages: []
        };
    } catch (error) {
        logger.error(`[LATEST_SNAPSHOT] Error getting latest snapshot: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
};

export const handleGetSnapshotRange = async (request: SnapshotRangeRequest, authConfig: IAuthConfig): Promise<ToolResult<ISnapshotRange[]>> => {
    try {
        const connector = await resolveScopedConnector({
            guid: request.guid,
            account_id: request.account_id,
            scope: request.scope
        }, authConfig);
        const { startTime, timespan, reverse, count } = request;

        const reverseFlag = reverse ? { reverse: true } : {};

        const body = {
            ...reverseFlag,
            start: startTime,
            span: timespan,
            count
        };

        const {
            requestConfig: rangeConfig,
            applyDataCallback: rangeParser
        } = getSnapshotRange(connector.account_id, connector.guid, body);

        const snapshotRange = await makeRequest(rangeConfig, authConfig, rangeParser);

        const totalCount = snapshotRange.length;
        const responseMessage = `Returned ${totalCount} snapshots`;

        return {
            result: snapshotRange,
            success: true,
            messages: [responseMessage]
        };
    } catch (error) {
        logger.error(`[SNAPSHOT_RANGE] Error getting snapshots range: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
};
