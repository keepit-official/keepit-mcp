import { getLatestSnapshot, getSnapshotCount, getSnapshotRange } from '../../api/snapshot-api.js';
import { LatestSnapshotRequestSchema, SnapshotRangeRequestSchema } from '../../utils/schemas/requests/snapshot.schemas.js';
import { logger } from './../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { validateAndSanitizeConnectorId } from '../../utils/sanitizers/connector-id.sanitizer.js';
import { validateAndSanitizeTimespan } from '../../utils/sanitizers/timespan.sanitizer.js';
import { validateAndSanitizeTimestamp } from '../../utils/sanitizers/timestamp.sanitizer.js';
import type { IDeviceSnapshot, ISnapshotRange } from '../../api/api-types/snapshot-api.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

type LatestSnapshotRequest = z.infer<typeof LatestSnapshotRequestSchema>;
type SnapshotRangeRequest = z.infer<typeof SnapshotRangeRequestSchema>;

export const getValidatedLatestSnapshotArgs = (toolParams: ToolParams): LatestSnapshotRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid
    };

    return validateLatestSnapshotRequest(requestArguments);
};

export const getValidatedSnapshotRangeArgs = (toolParams: ToolParams): SnapshotRangeRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid,
        startTime: toolParams.arguments?.startTime ?? new Date().toISOString(),
        timespan: toolParams.arguments?.timespan,
        reverse: toolParams.arguments?.reverse || false,
        count: toolParams.arguments?.count
    };

    return validateSnapshotRangeRequest(requestArguments);
};

export const validateLatestSnapshotRequest = (args: ToolArguments): LatestSnapshotRequest => {
    const validationResult = LatestSnapshotRequestSchema.safeParse(args);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(issue => {
            const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
            return `${path}${issue.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    return {
        guid: validateAndSanitizeConnectorId(validationResult.data.guid)
    };
};

export const validateSnapshotRangeRequest = (args: ToolArguments): SnapshotRangeRequest => {
    const validationResult = SnapshotRangeRequestSchema.safeParse(args);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(issue => {
            const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
            return `${path}${issue.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    const { guid, startTime, timespan, reverse, count } = validationResult.data;

    const validatedConnectorId = validateAndSanitizeConnectorId(guid);
    const validatedTimestamp = validateAndSanitizeTimestamp(startTime);
    const validatedTimespan = validateAndSanitizeTimespan(timespan);

    return {
        guid: validatedConnectorId,
        startTime: validatedTimestamp,
        timespan: validatedTimespan,
        reverse,
        count
    };
};

export const getLatestSnapshotByGuid = async (guid: string, authConfig: IAuthConfig): Promise<ToolResult<IDeviceSnapshot | null>> => {
    try {
        const {
            requestConfig,
            applyDataCallback
        } = getLatestSnapshot(authConfig.keepitGuid, guid);

        const latestSnapshot = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: latestSnapshot,
            success: true,
            messages: []
        };
    } catch (error) {
        logger.error(`[LATEST_SNAPSHOT] Error getting latest snapshot: ${error}`);
        throw error;
    }
};

export const handleGetSnapshotRange = async (request: SnapshotRangeRequest, authConfig: IAuthConfig): Promise<ToolResult<ISnapshotRange[]>> => {
    try {
        const { guid, startTime, timespan, reverse, count } = request;

        const reverseFlag = !startTime || reverse ? { reverse: true } : {};
        const effectiveStartTime = startTime || new Date().toISOString();
        const validatedStartTime = validateAndSanitizeTimestamp(effectiveStartTime);
        const validatedTimespan = validateAndSanitizeTimespan(timespan);

        const body = {
            ...reverseFlag,
            start: validatedStartTime,
            span: validatedTimespan,
            count
        };

        const {
            requestConfig: rangeConfig,
            applyDataCallback: rangeParser
        } = getSnapshotRange(authConfig.keepitGuid, guid, body);

        const snapshotRange = await makeRequest(rangeConfig, authConfig, rangeParser);

        const {
            requestConfig: countConfig,
            applyDataCallback: countParser
        } = getSnapshotCount(authConfig.keepitGuid, guid, body);

        const snapshotCount = await makeRequest(countConfig, authConfig, countParser);

        const responseMessage = snapshotCount > 100
            ? `Only first 100 snapshots are returned (total=${snapshotCount})`
            : `Returned ${snapshotCount} snapshots`;

        return {
            result: snapshotRange,
            success: true,
            messages: [`[SNAPSHOT_RANGE] ${responseMessage}`]
        };
    } catch (error) {
        logger.error(`[SNAPSHOT_RANGE] Error getting snapshots range: ${error}`);
        throw error;
    }
};
