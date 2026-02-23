import { getMyAccountInfo } from './account-tools.helper.js';
import type { ToolMetadata, ToolHandlers } from '../tools.interfaces';
import { createToolErrorResponse, createToolResponse } from '../../helpers/tool.helper.js';

type IAccountInfoResponse = Record<'account', IAccountInfo>;

export const ACCOUNT_TOOLS_HANDLER: ToolHandlers = {
    get_my_account_info: async (_, authConfig) => {
        try {
            const { success, messages, result: account } = await getMyAccountInfo(authConfig);

            const metadata: ToolMetadata = {
                tool: 'get_my_account_info',
                success,
                messages
            };

            return createToolResponse<IAccountInfoResponse>(
                { account },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('get_my_account_info', error);
        }
    }
};
