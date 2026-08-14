import {
    getAggregatedJobsCountSettings,
    getJobs,
    getJobsCountSettings,
    getJobsHistory
} from '../../api/jobs-api.js';
import type {
    AggregatedJobsCountSchema,
    JobHistorySchema,
    JobsCountSchema
} from '../../utils/schemas/requests/job.schemas.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { subtractPeriod, TIME_IN_MS } from '../../helpers/date.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { IJob, JobsResponse } from '../../api/api-types/jobs-api.js';
import type { z } from 'zod';

type JobHistoryRequest = z.infer<typeof JobHistorySchema>;
type JobsCountRequest = z.infer<typeof JobsCountSchema>;
type AggregatedJobsCountRequest = z.infer<typeof AggregatedJobsCountSchema>;

export const getJobsList = async (authConfig: IAuthConfig, params: { guid: string; }) => {
    try {
        const { requestConfig, applyDataCallback } = getJobs(authConfig.keepitGuid, params.guid, true);
        const jobs = await makeRequest<IJob[]>(requestConfig, authConfig, applyDataCallback);

        return {
            result: { jobs },
            success: true,
            messages: [`Found ${jobs.length} jobs for ${params.guid} connector`]
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs for connector}', error);
        throw error;
    }
};

export const handleGetJobHistory = async (authConfig: IAuthConfig, request: JobHistoryRequest) => {
    try {
        const endTimeNow = new Date();
        const endTimeISO = endTimeNow.toISOString();

        // if we didn't get a duration, go back 24 hours
        const startTime = request.duration
            ? subtractPeriod(request.duration, endTimeNow)
            : new Date(endTimeNow.getTime() - TIME_IN_MS.DAY);

        const startTimeISO = startTime.toISOString();

        const loadChunkDuration = 24;
        const jobs: IJob[] = [];
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
                jobs.push(...chunkResponse.result);
            }
        }

        return {
            ...baseResponse,
            result: { jobs },
            success: true,
            messages: [`Found ${jobs.length} jobs in history for ${request.guid} connector from ${startTimeISO} to ${endTimeISO}`],
            jobCount: jobs.length
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs}', error);
        throw error;
    }
};

export const getJobsCount = async (authConfig: IAuthConfig, request: JobsCountRequest) => {
    try {
        const {
            guid: deviceId,
            ...restParams
        } = request;

        const { requestConfig, applyDataCallback } = getJobsCountSettings(
            authConfig.keepitGuid,
            deviceId,
            restParams
        );
        const jobsCountData = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...jobsCountData },
            success: true,
            messages: ['Retrieved jobs count data']
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get jobs count: ', error);
        throw error;
    }
};

export const getAggregatedJobsCount = async (authConfig: IAuthConfig, requestParams: AggregatedJobsCountRequest) => {
    try {
        const { requestConfig, applyDataCallback } = getAggregatedJobsCountSettings(
            authConfig.keepitGuid,
            requestParams
        );
        const jobsCountData = await makeRequest(requestConfig, authConfig, applyDataCallback);

        return {
            result: { ...jobsCountData },
            success: true,
            messages: ['Retrieved aggregated jobs count data']
        };
    } catch (error) {
        logger.error('[JOBS] Failed to get aggregated jobs count: ', error);
        throw error;
    }
};
