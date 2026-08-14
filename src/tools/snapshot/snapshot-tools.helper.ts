import { getLatestSnapshot, getSnapshotCount, getSnapshotRange } from '../../api/snapshot-api.js';
import type { SnapshotRangeRequestSchema } from '../../utils/schemas/requests/snapshot.schemas.js';
import { logger } from './../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { z } from 'zod';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

type SnapshotRangeRequest = z.infer<typeof SnapshotRangeRequestSchema>;

export const getLatestSnapshotByGuid = async (authConfig: IAuthConfig, params: { guid: string; }) => {
    try {
        const {
            requestConfig,
            applyDataCallback
        } = getLatestSnapshot(authConfig.keepitGuid, params.guid);

        const snapshot = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { snapshot },
            success: true,
            messages: [],
            guid: params.guid
        };
    } catch (error) {
        logger.error(`[LATEST_SNAPSHOT] Error getting latest snapshot: ${error}`);
        throw error;
    }
};

export const handleGetSnapshotRange = async (authConfig: IAuthConfig, request: SnapshotRangeRequest) => {
    try {
        const { guid, ...body } = request;

        const {
            requestConfig: rangeConfig,
            applyDataCallback: rangeParser
        } = getSnapshotRange(authConfig.keepitGuid, guid, body);

        const snapshots = await makeRequest(rangeConfig, authConfig, rangeParser);

        const {
            requestConfig: countConfig,
            applyDataCallback: countParser
        } = getSnapshotCount(authConfig.keepitGuid, guid, body);

        const snapshotCount = await makeRequest(countConfig, authConfig, countParser);

        const responseMessage = snapshotCount > 100
            ? `Only first ${snapshots.length} snapshots are returned (total=${snapshotCount})`
            : `Returned ${snapshotCount} snapshots`;

        return {
            result: { snapshots },
            success: true,
            messages: [`[SNAPSHOT_RANGE] ${responseMessage}`],
            snapshotCount: snapshots.length
        };
    } catch (error) {
        logger.error(`[SNAPSHOT_RANGE] Error getting snapshots range: ${JSON.stringify(error)}`);
        throw error;
    }
};
