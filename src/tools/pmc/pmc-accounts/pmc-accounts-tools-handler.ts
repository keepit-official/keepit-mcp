import { createToolErrorResponse, createToolResponse } from '../../../helpers/tool.helper.js';
import { getMyPartnerAccountInfo, getSubaccountList, getSubaccountInfo } from './pmc-accounts-tools.helper.js';
import { getValidatedPmcToolArguments } from '../helpers/pmc-tool.helper.js';
import { PmcCustomerRequestBaseSchema } from '../schemas/pmc-base.schemas.js';
import type { ToolHandlers, ToolMetadata } from '../../tools.interfaces.js';

export const PMC_ACCOUNTS_TOOLS_HANDLER: ToolHandlers = {
    pmc_get_my_account_info: async (_request, authConfig) => {
        try {
            const { success, messages, result } = await getMyPartnerAccountInfo(authConfig);

            const metadata: ToolMetadata = {
                tool: 'pmc_get_my_account_info',
                success,
                messages
            };

            return createToolResponse({ account: result }, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_my_account_info', error);
        }
    },

    pmc_get_subaccount_list: async (_request, authConfig) => {
        try {
            const { success, messages, result } = await getSubaccountList(authConfig);

            const metadata: ToolMetadata = {
                tool: 'pmc_get_subaccount_list',
                success,
                messages
            };

            return createToolResponse(result, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_subaccount_list', error);
        }
    },

    pmc_get_subaccount_info: async (request, authConfig) => {
        try {
            const { customer_guid } = getValidatedPmcToolArguments(request.params, PmcCustomerRequestBaseSchema);
            const { success, messages, result } = await getSubaccountInfo(customer_guid, authConfig);

            const metadata: ToolMetadata = {
                tool: 'pmc_get_subaccount_info',
                success,
                messages
            };

            return createToolResponse({ account: result }, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_subaccount_info', error);
        }
    }
};
