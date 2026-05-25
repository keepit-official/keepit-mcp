import { createToolErrorResponse, createToolResponse } from '../../../helpers/tool.helper.js';
import { resolveCustomerAuthConfig } from '../../../helpers/auth-config.helper.js';
import { getConnectors } from '../../connector/connectors-tools.helper.js';
import { getSubaccountConnectorsHealthSummary, getConnectorIssueSolution, getAllCriticalConnectors } from './pmc-connectors-tools.helper.js';
import type { ToolHandlers, ToolMetadata } from '../../tools.interfaces.js';
import { getValidatedPmcToolArguments } from '../helpers/pmc-tool.helper.js';
import { PmcCustomerRequestBaseSchema } from '../schemas/pmc-base.schemas.js';
import { PmcConnectorIssueSolutionSchema } from '../schemas/pmc-connectors.schema.js';

type PmcConnectorsToolResponse = Record<'connectors', IConnector[]>;

export const PMC_CONNECTORS_TOOLS_HANDLER: ToolHandlers = {
    pmc_get_all_critical_connectors: async (_request, authConfig) => {
        try {
            const { success, messages, result } = await getAllCriticalConnectors(authConfig);

            return createToolResponse(result, {
                tool: 'pmc_get_all_critical_connectors',
                success,
                messages
            });
        } catch (error) {
            return createToolErrorResponse('pmc_get_all_critical_connectors', error);
        }
    },

    pmc_get_subaccount_connectors: async (request, authConfig) => {
        try {
            const { customer_guid } = getValidatedPmcToolArguments(request.params, PmcCustomerRequestBaseSchema);
            const customerAuthConfig = resolveCustomerAuthConfig(customer_guid, authConfig);

            const { success, messages, result: connectors } = await getConnectors(customerAuthConfig);

            const metadata: ToolMetadata = {
                tool: 'pmc_get_subaccount_connectors',
                success,
                messages
            };

            return createToolResponse<PmcConnectorsToolResponse>(
                { connectors },
                metadata
            );
        } catch (error) {
            return createToolErrorResponse('pmc_get_subaccount_connectors', error);
        }
    },

    pmc_get_connectors_health_summary: async (request, authConfig) => {
        try {
            const { customer_guid } = getValidatedPmcToolArguments(request.params, PmcCustomerRequestBaseSchema);
            const { success, messages, result } = await getSubaccountConnectorsHealthSummary(customer_guid, authConfig);

            const metadata: ToolMetadata = {
                tool: 'pmc_get_connectors_health_summary',
                success,
                messages
            };

            return createToolResponse({ connectorsHealth: result }, metadata);
        } catch (error) {
            return createToolErrorResponse('pmc_get_connectors_health_summary', error);
        }
    },

    pmc_get_connector_issue_solution: async (request, authConfig) => {
        try {
            const { customer_guid, connector_guid, connector_type } = getValidatedPmcToolArguments(request.params, PmcConnectorIssueSolutionSchema);
            const { success, messages, result } = await getConnectorIssueSolution(customer_guid, connector_guid, connector_type, authConfig);

            return createToolResponse(result, { tool: 'pmc_get_connector_issue_solution', success, messages });
        } catch (error) {
            return createToolErrorResponse('pmc_get_connector_issue_solution', error);
        }
    }
};
