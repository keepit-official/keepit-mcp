import { createToolErrorResponse, createToolResponse } from '../../../helpers/tool.helper.js';
import type { ToolHandlers, ToolMetadata } from '../../tools.interfaces.js';
import { getValidatedPmcToolArguments } from '../helpers/pmc-tool.helper.js';
import { PmcSeatAllocationSchema, PmcSeatLimitRequestSchema, PmcSeatUsageHistorySchema } from '../schemas/seats-usage.schema.js';
import { getSubaccountsExceedingSeatLimit, getSeatAllocation, getSubaccountSeatUsageHistory } from './pmc-usage-tools.helper.js';

type PmcSeatLimitsToolResponse = Record<'accounts', ISeatLimitAccount[]>;

export const PMC_USAGE_TOOLS_HANDLER: ToolHandlers = {
    pmc_get_exceeding_seat_limit: async (request, authConfig) => {
        try {
            const { 'resource-group': resourceGroup } = getValidatedPmcToolArguments(
                request.params,
                PmcSeatLimitRequestSchema
            );

            const { success, messages, result: accounts } = await getSubaccountsExceedingSeatLimit(
                authConfig,
                resourceGroup
            );

            const metadata: ToolMetadata = {
                tool: 'pmc_get_exceeding_seat_limit',
                success,
                messages
            };

            return createToolResponse<PmcSeatLimitsToolResponse>(
                { accounts },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('pmc_get_exceeding_seat_limit', error);
        }
    },

    pmc_get_seats_allocation: async (request, authConfig) => {
        try {
            const { customer_guid, timeRange } = getValidatedPmcToolArguments(
                request.params,
                PmcSeatAllocationSchema
            );

            const { success, messages, result } = await getSeatAllocation(
                authConfig,
                timeRange,
                customer_guid
            );

            const metadata: ToolMetadata = {
                tool: 'pmc_get_seats_allocation',
                success,
                messages
            };

            return createToolResponse(result as unknown as Record<string, unknown>, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_seats_allocation', error);
        }
    },

    pmc_get_subaccount_seat_usage_history: async (request, authConfig) => {
        try {
            const { customer_guid, timeRange } = getValidatedPmcToolArguments(
                request.params,
                PmcSeatUsageHistorySchema
            );

            const { success, messages, result: snapshots } = await getSubaccountSeatUsageHistory(
                authConfig,
                customer_guid,
                timeRange
            );

            const metadata: ToolMetadata = {
                tool: 'pmc_get_subaccount_seat_usage_history',
                success,
                messages
            };

            return createToolResponse({ snapshots } as unknown as Record<string, unknown>, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_subaccount_seat_usage_history', error);
        }
    }
};
