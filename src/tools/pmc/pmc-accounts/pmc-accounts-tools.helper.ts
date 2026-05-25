import { getUserSettings, getUserContacts, getUserProduct, getSubaccountListItems, getUserResources, getPortfolioResources } from '../../../api/account-api.js';
import { MakeRequestErrorException } from '../../../helpers/make-request.helper.js';
import { getTokens } from '../../../api/authentication-api.js';
import { makeRequest } from '../../../helpers/make-request.helper.js';
import { logger } from '../../../logger/logger.js';
import type { IAuthConfig } from '../../../helpers/auth-config.helper.js';
import { resolveCustomerAuthConfig } from '../../../helpers/auth-config.helper.js';

const getBasicAccountInfo = async (userId: string, authConfig: IAuthConfig) => {
    const { requestConfig: settingsConfig, applyDataCallback: settingsCallback } = getUserSettings(userId);
    const { requestConfig: contactsConfig, applyDataCallback: contactsCallback } = getUserContacts(userId);
    const { requestConfig: productConfig, applyDataCallback: productCallback } = getUserProduct(userId);
    const { requestConfig: tokensConfig, applyDataCallback: tokensCallback } = getTokens(userId);

    const [settingsRaw, contactRaw, product, tokensRaw] = await Promise.all([
        makeRequest(settingsConfig, authConfig, settingsCallback),
        makeRequest(contactsConfig, authConfig, contactsCallback),
        makeRequest(productConfig, authConfig, productCallback),
        makeRequest(tokensConfig, authConfig, tokensCallback)
    ]);

    const contact: IContact = {
        email: contactRaw.email ?? '',
        companyname: contactRaw.companyname ?? '',
        fullname: contactRaw.fullname ?? ''
    };

    const tokens = tokensRaw
        .filter((t: IAuthTokenShort) => t.primary)
        .map(({ descr, aname, acl }: IAuthTokenShort) => ({ descr, aname, acl }));

    return {
        id: userId,
        created: settingsRaw.created || '',
        product,
        contact,
        tokens
    };
};

export const getMyPartnerAccountInfo = async (authConfig: IAuthConfig) => {
    try {
        const result = await getBasicAccountInfo(authConfig.keepitGuid, authConfig);
        logger.info(`[PMC_ACCOUNT_INFO] Retrieved info for partner: ${authConfig.keepitGuid}`);
        return { result, success: true, messages: ['Account information retrieved successfully'] };
    } catch (error) {
        logger.error('[PMC_ACCOUNT_INFO] Error getting partner account info:', error);
        throw error;
    }
};

export const getSubaccountInfo = async (customerGuid: string, authConfig: IAuthConfig) => {
    try {
        const customerAuthConfig = resolveCustomerAuthConfig(customerGuid, authConfig);
        const { requestConfig: resourcesConfig, applyDataCallback: resourcesCallback } = getUserResources(customerGuid);
        const { requestConfig: portfolioConfig, applyDataCallback: portfolioCallback } = getPortfolioResources(authConfig.keepitGuid);

        const [basicInfo, resourcesRaw, portfolioRaw] = await Promise.all([
            getBasicAccountInfo(customerGuid, customerAuthConfig),
            makeRequest(resourcesConfig, customerAuthConfig, resourcesCallback),
            makeRequest(portfolioConfig, authConfig, portfolioCallback)
        ]);

        const workloadNames = portfolioRaw
            .filter((r: IPortfolioResource) => r.group === 'clouddevs' && r.name !== 'clouds')
            .map((r: IPortfolioResource) => r.name);

        const availableWorkloads: string[] = resourcesRaw
            .filter((r: IResource) => workloadNames.includes(r.name))
            .map((r: IResource) => r.name);

        logger.info(`[PMC_SUBACCOUNT_INFO] Retrieved info for customer: ${customerGuid}`);

        return {
            result: { ...basicInfo, available_workloads: availableWorkloads },
            success: true,
            messages: ['Account information retrieved successfully']
        };
    } catch (error) {
        logger.error('[PMC_SUBACCOUNT_INFO] Error getting subaccount info:', error);
        throw error;
    }
};

export const getSubaccountList = async (authConfig: IAuthConfig) => {
    try {
        const { requestConfig, applyDataCallback } = getSubaccountListItems(authConfig.keepitGuid);
        const { accounts, accountsTotalCount } = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const subaccounts = accounts.map((user) => ({
            id: user.id,
            created: user.created,
            contact: {
                email: user.contact?.email ?? '',
                companyname: user.contact?.companyname ?? '',
                fullname: user.contact?.fullname ?? ''
            }
        }));

        logger.info(`[PMC_SUBACCOUNT_LIST] Retrieved ${accountsTotalCount} subaccounts`);

        return { result: { subaccounts, subaccountCount: parseInt(accountsTotalCount, 10) }, success: true, messages: [] };
    } catch (error) {
        if (error instanceof MakeRequestErrorException && error.code === 404) {
            logger.info('[PMC_SUBACCOUNT_LIST] No subaccounts found (404)');
            return { result: { subaccounts: [], subaccountCount: 0 }, success: true, messages: [] };
        }
        logger.error('[PMC_SUBACCOUNT_LIST] Error getting subaccount list:', error);
        throw error;
    }
};
