import { findUserToken } from '../../helpers/user-role.helper.js';
import { generateEaclPermissions, userACL } from '../../helpers/acl.helper.js';
import { getTokens } from '../../api/authentication-api.js';
import { getUser, getUserSettings } from '../../api/account-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

export const getUserId = async (authConfig: IAuthConfig): Promise<string> => {
    try {
        const { requestConfig, applyDataCallback } = getUser();
        const userGuid = await makeRequest(requestConfig, authConfig, applyDataCallback);
        logger.info(`[ACCOUNT_INFO] Using account ID: ${userGuid}`);

        return userGuid;

    } catch (error) {
        logger.error('[ACCOUNT_INFO] Error getting user id:', error);
        throw error;
    }
};

export const getUserRole = async (authConfig: IAuthConfig): Promise<string> => {
    try {
        const { requestConfig, applyDataCallback } = getTokens(authConfig.keepitGuid, { secondary: 1 });
        const response = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const userToken = findUserToken(response, authConfig.keepitLogin);

        logger.info(`User role set: ${userToken.acl}`);

        userACL.eacl = userToken.eacl;
        userACL.aclObject = { ...generateEaclPermissions(userToken.eacl) };

        return userToken.acl;
    } catch (error) {
        logger.debug(`[ROLE_INIT_ERROR] ${JSON.stringify(error)}`);
        return '';
    }
};

export const getMyAccountInfo = async (authConfig: IAuthConfig) => {
    try {
        // For account info, we make a request to /users/{account-id}
        const { requestConfig, applyDataCallback } = getUserSettings(authConfig.keepitGuid);
        logger.info(`[ACCOUNT_INFO] Making request to: ${requestConfig.url}`);
        logger.info(`[ACCOUNT_INFO] Using account ID: ${authConfig.keepitGuid}`);

        const response = await makeRequest(requestConfig, authConfig, applyDataCallback);

        logger.info('[ACCOUNT_INFO] Parsed JSON data:', response);

        const account = {
            id: authConfig.keepitGuid,
            enabled: response.enabled === true,
            created: response.created || '',
            product: response.product || '',
            parent: response.parent || '',
            subscribed: response.subscribed === true
        };

        logger.info(`[ACCOUNT_INFO] Successfully retrieved account info for: ${authConfig.keepitGuid}`);

        return {
            result: { account },
            success: true,
            messages: ['Account information retrieved successfully']
        };
    } catch (error) {
        logger.error('[ACCOUNT_INFO] Error getting account info:', error);
        throw error;
    };
};
