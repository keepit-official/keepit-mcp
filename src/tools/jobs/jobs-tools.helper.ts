import { getJobs, getJobsHistory } from '../../api/jobs-api.js';
import { JobHistorySchema } from '../../utils/schemas/requests/job.schemas.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { subtractPeriod, TIME_IN_MS } from '../../helpers/date.helper.js';
import { validateAndSanitizeConnectorId } from '../../utils/sanitizers/connector-id.sanitizer.js';
import { resolveScopedConnector } from '../connector/connectors-tools.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { IJob } from '../../api/api-types/jobs-api.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type JobHistoryRequest = z.infer<typeof JobHistorySchema>;

const JOBS_FETCH_CONCURRENCY = 5;

export const getValidatedJobArguments = (toolParams: ToolParams): JobHistoryRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid,
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope,
        duration: toolParams.arguments?.duration,
        startTime: toolParams.arguments?.startTime,
        endTime: toolParams.arguments?.endTime
    };

    return validateJobRequest(requestArguments);
};

const validateJobRequest = (request: ToolArguments): JobHistoryRequest => {
    const validationResult = JobHistorySchema.safeParse(request);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => {
            const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
            return `${path}${err.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    const { guid, account_id, scope, duration, startTime, endTime } = validationResult.data;

    return {
        guid: validateAndSanitizeConnectorId(guid),
        account_id,
        scope,
        duration,
        startTime,
        endTime
    };
};

export const getJobsList = async (request: JobHistoryRequest, authConfig: IAuthConfig): Promise<ToolResult<IJob[]>> => {
    try {
        const connector = await resolveScopedConnector({
            guid: request.guid,
            account_id: request.account_id,
            scope: request.scope
        }, authConfig);

        const { requestConfig, applyDataCallback } = getJobs(connector.account_id, connector.guid, true);
        const jobs = await makeRequest<IJob[]>(requestConfig, authConfig, applyDataCallback);

        return {
            result: jobs,
            success: true,
            messages: [`Found ${jobs.length} jobs for ${connector.guid} connector on account ${connector.account_id}`]
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs for connector', error);
        throw error;
    }
};

export const handleGetJobHistory = async (request: JobHistoryRequest, authConfig: IAuthConfig): Promise<ToolResult<IJob[]>> => {
    try {
        const connector = await resolveScopedConnector({
            guid: request.guid,
            account_id: request.account_id,
            scope: request.scope
        }, authConfig);

        const now = new Date();

        let startTimeISO: string;
        let endTimeISO: string;

        if (request.startTime) {
            startTimeISO = request.startTime;
            endTimeISO = request.endTime ?? now.toISOString();
        } else if (request.duration) {
            endTimeISO = now.toISOString();
            startTimeISO = subtractPeriod(request.duration, now).toISOString();
        } else {
            // default: last 24 hours
            endTimeISO = now.toISOString();
            startTimeISO = new Date(now.getTime() - TIME_IN_MS.DAY).toISOString();
        }

        const loadChunkDuration = 24;

        const totalHours = (new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime()) / TIME_IN_MS.HOUR;
        const iterations = Math.ceil(totalHours / loadChunkDuration);

        const chunks = Array.from({ length: iterations }, (_, i) => {
            const currentTo = new Date(endTimeISO).getTime() - i * loadChunkDuration * TIME_IN_MS.HOUR;
            const currentFrom = new Date(currentTo - loadChunkDuration * TIME_IN_MS.HOUR);
            return {
                fromISO: currentFrom < new Date(startTimeISO) ? startTimeISO : currentFrom.toISOString(),
                toISO: new Date(currentTo).toISOString()
            };
        });

        const allResults: IJob[] = [];
        for (let i = 0; i < chunks.length; i += JOBS_FETCH_CONCURRENCY) {
            const batch = chunks.slice(i, i + JOBS_FETCH_CONCURRENCY);
            const batchResponses = await Promise.all(
                batch.map(({ fromISO, toISO }) => {
                    const body = { 'from-time': fromISO, 'to-time': toISO, 'active-only': 'false' };
                    const { requestConfig, applyDataCallback } = getJobsHistory(connector.account_id, connector.guid, body);
                    return makeRequest(requestConfig, authConfig, applyDataCallback);
                })
            );
            for (const chunkResponse of batchResponses) {
                if (Array.isArray(chunkResponse.result)) {
                    allResults.push(...chunkResponse.result);
                }
            }
        }

        return {
            result: allResults,
            success: true,
            messages: [`Found ${allResults.length} jobs in history for ${connector.guid} connector on account ${connector.account_id} from ${startTimeISO} to ${endTimeISO}`]
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs', error);
        throw error;
    }
};
