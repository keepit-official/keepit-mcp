import { getMyAccountInfo } from './account-tools.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import { createToolHandler } from '../../helpers/tool.helper.js';

export const ACCOUNT_TOOLS_HANDLER: ToolHandlers = {
    get_my_account_info: async (_, authConfig) => 
        createToolHandler({
            toolName: 'get_my_account_info',
            toolHandler: getMyAccountInfo,
            authConfig
        })
};
