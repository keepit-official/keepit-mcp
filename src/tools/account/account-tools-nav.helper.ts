/**
 * Auth bootstrap and account navigation helpers.
 *
 * These are the lowest-level account functions called at server startup
 * (getUserId, getUserRole) and the top-level account discovery tools
 * exposed to MCP callers (listAccounts, listSubAccounts, findAccount).
 */
import { findUserToken } from '../../helpers/user-role.helper.js';
import { generateEaclPermissions, type IUserACL } from '../../helpers/acl.helper.js';
import { getTokens } from '../../api/authentication-api.js';
import { getUser } from '../../api/account-api.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import {
    buildScopeMeta,
    createRequestCache,
    findAccountsByQuery,
    getAccountsForScope,
    type IScopedAccount
} from './account-context.helper.js';
import { withMeta, type TToolResult, type TTokenLike } from './account-tools-utils.js';

export const getUserId = async (authConfig: IAuthConfig): Promise<string> => {
    try {
        const { requestConfig, applyDataCallback } = getUser();
        const userGuid = await makeRequest<string>(requestConfig, authConfig, applyDataCallback);
        logger.info(`[ACCOUNT_INFO] Using account ID: ${userGuid}`);
        return userGuid;
    } catch (error) {
        logger.error('[ACCOUNT_INFO] Error getting user id:', error);
        throw error;
    }
};

export const getUserRole = async (authConfig: IAuthConfig): Promise<{ role: string; userAcl: IUserACL; }> => {
    try {
        const { requestConfig, applyDataCallback } = getTokens(authConfig.keepitGuid, { secondary: 1 });
        const response = await makeRequest<TTokenLike[]>(requestConfig, authConfig, applyDataCallback);
        const userToken = findUserToken(response as IAuthToken[], authConfig.keepitLogin);
        logger.info(`User role set: ${userToken.acl}`);
        return {
            role: userToken.acl,
            userAcl: {
                eacl: userToken.eacl,
                aclObject: { ...generateEaclPermissions(userToken.eacl) }
            }
        };
    } catch (error) {
        logger.error('[ROLE_INIT_ERROR] Failed to resolve user role and ACL during startup', error);
        throw new Error('Failed to resolve user role and ACL during startup');
    }
};

export const listAccounts = async (authConfig: IAuthConfig, options: { accountId?: string; scope?: string; } = {}): Promise<TToolResult<IScopedAccount[]>> => {
    const cache = createRequestCache();
    const resolvedAccounts = await getAccountsForScope(authConfig, {
        accountId: options.accountId,
        scope: options.scope,
        defaultScope: 'all',
        exactOnAccountId: false,
        cache
    });
    return withMeta(resolvedAccounts.accounts, [`Found ${resolvedAccounts.accounts.length} accounts`].concat(resolvedAccounts.warnings), buildScopeMeta('list_accounts', resolvedAccounts));
};

export const listSubAccounts = async (authConfig: IAuthConfig, accountId?: string): Promise<TToolResult<IScopedAccount[]>> => {
    const cache = createRequestCache();
    const resolvedAccounts = await getAccountsForScope(authConfig, {
        accountId,
        scope: 'children',
        defaultScope: 'children',
        exactOnAccountId: false,
        cache
    });
    return withMeta(resolvedAccounts.accounts, [`Found ${resolvedAccounts.accounts.length} sub-accounts`].concat(resolvedAccounts.warnings), buildScopeMeta('list_sub_accounts', resolvedAccounts));
};

export const findAccount = async (
    authConfig: IAuthConfig,
    options: { query: string; accountId?: string; scope?: string; }
): Promise<TToolResult<IScopedAccount[]>> => {
    const cache = createRequestCache();
    const resolvedAccounts = await getAccountsForScope(authConfig, {
        accountId: options.accountId,
        scope: options.scope,
        defaultScope: 'all',
        exactOnAccountId: false,
        cache
    });
    const matches = findAccountsByQuery(resolvedAccounts.accounts, options.query);
    return withMeta(matches, [`Found ${matches.length} matching accounts for "${options.query}"`].concat(resolvedAccounts.warnings), buildScopeMeta('find_account', resolvedAccounts, { query: options.query }));
};
