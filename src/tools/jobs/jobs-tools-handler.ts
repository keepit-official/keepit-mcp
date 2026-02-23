import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';
import { handleGetJobHistory, getJobsList, getValidatedJobArguments } from './jobs-tools.helper.js';
import type { IJob } from '../../api/api-types/jobs-api.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

type JobsToolResponse = Record<'jobs', IJob[]>;

export const JOBS_TOOLS_HANDLER: ToolHandlers = {
    get_active_jobs: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const { guid } = getValidatedJobArguments(request.params);

            const { success, messages, result: jobs } = await getJobsList(
                guid,
                authConfig
            );

            const metadata: ToolMetadata = {
                tool: 'get_active_jobs',
                success,
                messages
            };

            return createToolResponse<JobsToolResponse>(
                { jobs },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_active_jobs', error);
        }
    },

    get_job_history: async (request: CallToolRequest, authConfig: IAuthConfig) => {
        try {
            const toolArguments = getValidatedJobArguments(request.params);

            const { success, messages, result: jobs } = await handleGetJobHistory(
                toolArguments,
                authConfig
            );
            const metadata: ToolMetadata = {
                tool: 'get_job_history',
                jobCount: jobs.length,
                success,
                messages
            };

            return createToolResponse<JobsToolResponse>(
                { jobs },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_job_history', error);
        }
    }
};
