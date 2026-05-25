import { getJobs, getJobsHistory } from '../../api/jobs-api.js';
import { JobHistorySchema } from '../../utils/schemas/requests/job.schemas.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { subtractPeriod, TIME_IN_MS } from '../../helpers/date.helper.js';
import { validateAndSanitizeConnectorId } from '../../utils/sanitizers/connector-id.sanitizer.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { IJob, JobsResponse } from '../../api/api-types/jobs-api.js';
import type { ToolArguments, ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type JobHistoryRequest = z.infer<typeof JobHistorySchema>;

export const getValidatedJobArguments = (toolParams: ToolParams): JobHistoryRequest => {
    const requestArguments = {
        guid: toolParams.arguments?.guid,
        duration: toolParams.arguments?.duration
    };

    return validateJobRequest(requestArguments);
};

const validateJobRequest = (request: ToolArguments): JobHistoryRequest => {
    const validationResult = JobHistorySchema.safeParse(request);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(issue => {
            const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
            return `${path}${issue.message}`;
        }).join('; ');
        throw new Error(`Invalid configuration: ${errorMessages}`);
    }

    const {
        guid,
        duration: lookbackDuration
    } = validationResult.data;

    return {
        guid: validateAndSanitizeConnectorId(guid),
        duration: lookbackDuration
    };
};

export const getJobsList = async (connectorGuid: string, authConfig: IAuthConfig): Promise<ToolResult<IJob[]>> => {
    try {
        const { requestConfig, applyDataCallback } = getJobs(authConfig.keepitGuid, connectorGuid, true);
        const jobs = await makeRequest<IJob[]>(requestConfig, authConfig, applyDataCallback);

        return {
            result: jobs,
            success: true,
            messages: [`Found ${jobs.length} jobs for ${connectorGuid} connector`]
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs for connector}', error);
        throw error;
    }
};

export const handleGetJobHistory = async (request: JobHistoryRequest, authConfig: IAuthConfig): Promise<ToolResult<IJob[]>> => {
    try {
        const endTimeNow = new Date();
        const endTimeISO = endTimeNow.toISOString();

        // if we didn't get a duration, go back 24 hours
        const startTime = request.duration
            ? subtractPeriod(request.duration, endTimeNow)
            : new Date(endTimeNow.getTime() - TIME_IN_MS.DAY);

        const startTimeISO = startTime.toISOString();

        const loadChunkDuration = 24;
        const allResults: IJob[] = [];
        let baseResponse: JobsResponse | null = null;

        const totalHours = (new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime()) / TIME_IN_MS.HOUR;
        const iterations = Math.ceil(totalHours / loadChunkDuration);

        for (let i = 0; i < iterations; i++) {
            const currentTo = new Date(endTimeISO).getTime() - i * loadChunkDuration * TIME_IN_MS.HOUR;
            const currentFrom = new Date(currentTo - loadChunkDuration * TIME_IN_MS.HOUR);

            const fromISO = currentFrom < new Date(startTimeISO) ? startTimeISO : currentFrom.toISOString();
            const toISO = new Date(currentTo).toISOString();

            const body = {
                'from-time': fromISO,
                'to-time': toISO,
                'active-only': 'false'
            };

            const { requestConfig, applyDataCallback } = getJobsHistory(authConfig.keepitGuid, request.guid, body);
            const chunkResponse: JobsResponse = await makeRequest(requestConfig, authConfig, applyDataCallback);

            if (!baseResponse) {
                baseResponse = { ...chunkResponse, result: [] };
            }

            if (Array.isArray(chunkResponse.result)) {
                allResults.push(...chunkResponse.result);
            }
        }

        return {
            ...baseResponse,
            result: allResults,
            success: true,
            messages: [`Found ${allResults.length} jobs in history for ${request.guid} connector from ${startTimeISO} to ${endTimeISO}`]
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs}', error);
        throw error;
    }
};
