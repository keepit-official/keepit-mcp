import { createToolHandler } from '../../helpers/tool.helper.js';
import {
    handleGetJobHistory,
    getJobsList,
    getJobsCount,
    getAggregatedJobsCount
} from './jobs-tools.helper.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { AggregatedJobsCountSchema, JobHistorySchema, JobsCountSchema } from '../../utils/schemas/requests/job.schemas.js';

export const JOBS_TOOLS_HANDLER: ToolHandlers = {
    get_active_jobs: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'get_active_jobs',
            toolRequest: request,
            toolHandler: getJobsList,
            validationSchema: JobHistorySchema,
            authConfig
        }),
    get_job_history: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_job_history',
            toolRequest: request,
            toolHandler: handleGetJobHistory,
            validationSchema: JobHistorySchema,
            authConfig
        }),
    get_jobs_count: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_jobs_count',
            toolRequest: request,
            toolHandler: getJobsCount,
            validationSchema: JobsCountSchema,
            authConfig
        }),
    get_aggregated_jobs_count: async (request: CallToolRequest, authConfig: IAuthConfig) => 
        createToolHandler({
            toolName: 'get_aggregated_jobs_count',
            toolRequest: request,
            toolHandler: getAggregatedJobsCount,
            validationSchema: AggregatedJobsCountSchema,
            authConfig
        })
};
