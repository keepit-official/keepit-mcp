import { getAccountPortfolio, getPrimaryContact, getSubAccountsList, getUserSettings } from '../../api/account-api.js';
import { getTokens } from '../../api/authentication-api.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { logger } from '../../logger/logger.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';

const DEFAULT_CONCURRENCY = 5;

export type TAccountScope = 'account' | 'children' | 'leaf' | 'managed' | 'all';

export interface IScopedAccount {
    id: string;
    account_name: string | null;
    external_id: string | null;
    product_name: string | null;
    enabled: boolean;
    created: string;
    parent_id: string | null;
}

export type TRequestCache = Map<string, Promise<unknown>>;

type TResolvedAccountIds = {
    scope: TAccountScope;
    baseAccountId: string;
    accountIds: string[];
};

export type TResolvedAccounts = TResolvedAccountIds & {
    accounts: IScopedAccount[];
    warnings: string[];
};

const SCOPE_ALIASES: Record<string, TAccountScope> = {
    account: 'account',
    my: 'account',
    current: 'account',
    self: 'account',
    authenticated: 'account',
    children: 'children',
    child: 'children',
    leaf: 'leaf',
    leaves: 'leaf',
    managed: 'managed',
    msp: 'managed',
    managedclient: 'managed',
    managedclients: 'managed',
    managedcustomer: 'managed',
    managedcustomers: 'managed',
    managedtenant: 'managed',
    managedtenants: 'managed',
    descendant: 'leaf',
    descendants: 'leaf',
    tenant: 'leaf',
    tenants: 'leaf',
    client: 'leaf',
    clients: 'leaf',
    customer: 'leaf',
    customers: 'leaf',
    subaccounts: 'children',
    subaccount: 'children',
    all: 'all',
    everything: 'all'
};

export const createRequestCache = (): TRequestCache => new Map<string, Promise<unknown>>();

export const memoizeRequest = async <T>(
    cache: TRequestCache | undefined,
    key: string,
    loader: () => Promise<T>
): Promise<T> => {
    if (!cache) {
        return loader();
    }

    if (!cache.has(key)) {
        cache.set(key, Promise.resolve().then(loader).catch((err) => {
            // Evict on failure so a subsequent call can retry rather than permanently serving
            // the cached rejection to all callers that share this cache key.
            cache.delete(key);
            throw err;
        }));
    }

    return cache.get(key) as Promise<T>;
};

export const mapWithConcurrency = async <T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    concurrency = DEFAULT_CONCURRENCY
): Promise<R[]> => {
    const limit = Math.max(1, Math.min(concurrency, items.length || 1));
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const worker = async () => {
        while (true) {
            const currentIndex = nextIndex;
            if (currentIndex >= items.length) {
                return;
            }

            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    };

    await Promise.all(Array.from({ length: limit }, () => worker()));
    return results;
};

const normalizeScope = (scope?: string | null, defaultScope: TAccountScope = 'account'): TAccountScope => {
    if (!scope) {
        return defaultScope;
    }

    const normalized = String(scope).trim().toLowerCase();
    const mapped = SCOPE_ALIASES[normalized];
    if (!mapped) {
        throw new Error(`Unsupported scope "${scope}". Use "account", "children", "leaf", "managed", or "all".`);
    }

    return mapped;
};

export const getEffectiveScope = (options: {
    scope?: string | null;
    defaultScope?: TAccountScope;
    hasAccountId?: boolean;
    exactOnAccountId?: boolean;
}): TAccountScope => {
    if (options.scope !== undefined && options.scope !== null && options.scope !== '') {
        return normalizeScope(options.scope, options.defaultScope ?? 'account');
    }

    if (options.hasAccountId && (options.exactOnAccountId ?? true)) {
        return 'account';
    }

    return options.defaultScope ?? 'account';
};

export const mapPrimaryContact = (rawContact: IPrimaryContactResponseObject | null | undefined) => ({
    type: rawContact?.type || null,
    full_name: rawContact?.fullname || null,
    email: rawContact?.email || null,
    company_name: rawContact?.company_name || rawContact?.companyname || null,
    language: rawContact?.language || null
});

const getAccountName = (
    rawAccount: IGetUserResponseObject | null | undefined,
    primaryContact: ReturnType<typeof mapPrimaryContact> | null
) => {
    const candidate = primaryContact?.company_name
        ?? rawAccount?.company
        ?? rawAccount?.companyname
        ?? rawAccount?.name
        ?? rawAccount?.displayname
        ?? rawAccount?.['display-name']
        ?? null;

    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
};

export const mapAccount = (
    accountId: string,
    rawAccount: IGetUserResponseObject & { product_name?: string | null; },
    primaryContact: ReturnType<typeof mapPrimaryContact> | null
): IScopedAccount => ({
    id: accountId,
    account_name: getAccountName(rawAccount, primaryContact),
    external_id: rawAccount?.external_id ?? null,
    product_name: rawAccount?.product_name ?? null,
    enabled: rawAccount?.enabled === true,
    created: rawAccount?.created || '',
    parent_id: rawAccount?.parent || null
});

const getProductName = async (
    authConfig: IAuthConfig,
    portfolioAccountId: string,
    productId: string | null | undefined,
    cache?: TRequestCache
): Promise<string | null> => {
    if (!productId || !portfolioAccountId) {
        return null;
    }

    try {
        const products = await memoizeRequest(cache, `portfolio:${portfolioAccountId}`, async () => {
            const { requestConfig, applyDataCallback } = getAccountPortfolio(portfolioAccountId);
            logger.info(`[ACCOUNT_CONTEXT] Loading portfolio for ${portfolioAccountId} to resolve product ${productId}`);
            return makeRequest<Array<{ id: string | null; name: string | null; }>>(requestConfig, authConfig, applyDataCallback);
        });

        const match = Array.isArray(products) ? products.find((product) => product?.id === productId) : null;
        return match?.name || null;
    } catch {
        logger.info(`[ACCOUNT_CONTEXT] No portfolio product match available for ${productId} via ${portfolioAccountId}`);
        return null;
    }
};

export const getPrimaryContactDetails = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache?: TRequestCache
) => {
    try {
        const response = await memoizeRequest(cache, `primary-contact:${accountId}`, async () => {
            const { requestConfig, applyDataCallback } = getPrimaryContact(accountId);
            logger.info(`[ACCOUNT_CONTEXT] Loading primary contact for ${accountId}`);
            return makeRequest<IPrimaryContactResponseObject | null>(requestConfig, authConfig, applyDataCallback);
        });

        return response ? mapPrimaryContact(response) : null;
    } catch {
        logger.info(`[ACCOUNT_CONTEXT] No primary contact available for ${accountId}`);
        return null;
    }
};

export const getAccountDetails = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache?: TRequestCache
): Promise<IScopedAccount> => {
    return memoizeRequest(cache, `account-details:${accountId}`, async () => {
        const { requestConfig, applyDataCallback } = getUserSettings(accountId);
        logger.info(`[ACCOUNT_CONTEXT] Loading account details for ${accountId}`);
        const response = await makeRequest<IGetUserResponseObject>(requestConfig, authConfig, applyDataCallback);
        const primaryContact = await getPrimaryContactDetails(authConfig, accountId, cache);
        const productName = await getProductName(authConfig, response?.parent || accountId, response?.product || null, cache);
        return mapAccount(accountId, { ...response, product_name: productName }, primaryContact);
    });
};

export const getSubAccountIds = async (
    authConfig: IAuthConfig,
    parentAccountId: string,
    cache?: TRequestCache
): Promise<string[]> => {
    return memoizeRequest(cache, `subaccount-ids:${parentAccountId}`, async () => {
        const { requestConfig, applyDataCallback } = getSubAccountsList(parentAccountId);
        logger.info(`[ACCOUNT_CONTEXT] Loading sub-account ids for ${parentAccountId}`);
        return makeRequest<string[]>(requestConfig, authConfig, applyDataCallback);
    });
};

const getLeafAccountIds = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache?: TRequestCache,
    visited = new Set<string>()
): Promise<string[]> => {
    // visited is shared across all recursive branches (passed by reference), so any node
    // seen on any path through the tree is skipped globally — preventing infinite loops
    // caused by cycles in the API-returned account hierarchy.
    if (visited.has(accountId)) {
        logger.warn(`[ACCOUNT_CONTEXT] Cycle detected in account tree at ${accountId}, stopping traversal`);
        return [];
    }
    visited.add(accountId);

    const childAccountIds = await getSubAccountIds(authConfig, accountId, cache);
    if (!Array.isArray(childAccountIds) || childAccountIds.length === 0) {
        return [accountId];
    }

    const descendantLeafIds = await mapWithConcurrency(
        childAccountIds,
        (childAccountId) => getLeafAccountIds(authConfig, childAccountId, cache, visited)
    );

    return descendantLeafIds.flat();
};

const getAccountBranchAcl = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache?: TRequestCache
): Promise<string | null> => {
    return memoizeRequest(cache, `account-branch-acl:${accountId}`, async () => {
        try {
            const { requestConfig, applyDataCallback } = getTokens(accountId);
            logger.info(`[ACCOUNT_CONTEXT] Loading token ACLs for ${accountId}`);
            const tokens = await makeRequest<Array<{ acl?: string | null; primary?: boolean | string; }>>(requestConfig, authConfig, applyDataCallback);
            const aclValues = Array.isArray(tokens)
                ? [...new Set(tokens.map((token) => token?.acl).filter(Boolean))]
                : [];

            if (aclValues.includes('MSPPartner')) {
                return 'MSPPartner';
            }

            if (aclValues.includes('PartnerParent')) {
                return 'PartnerParent';
            }

            const primaryToken = Array.isArray(tokens)
                ? tokens.find((token) => token?.primary === true || token?.primary === 'true')
                : null;

            return primaryToken?.acl || aclValues[0] || null;
        } catch {
            logger.info(`[ACCOUNT_CONTEXT] No token ACLs available for ${accountId}`);
            return null;
        }
    });
};

const getManagedAccountIds = async (
    authConfig: IAuthConfig,
    accountId: string,
    cache?: TRequestCache,
    visited = new Set<string>()
): Promise<string[]> => {
    if (visited.has(accountId)) {
        logger.warn(`[ACCOUNT_CONTEXT] Cycle detected in managed account tree at ${accountId}, stopping traversal`);
        return [];
    }
    visited.add(accountId);

    const childAccountIds = await getSubAccountIds(authConfig, accountId, cache);
    if (!Array.isArray(childAccountIds) || childAccountIds.length === 0) {
        return [accountId];
    }

    const baseAcl = await getAccountBranchAcl(authConfig, accountId, cache);
    if (baseAcl === 'MSPPartner') {
        return getLeafAccountIds(authConfig, accountId, cache);
    }

    const childSummaries = await mapWithConcurrency(childAccountIds, async (childAccountId) => {
        const [grandchildIds, childAcl] = await Promise.all([
            getSubAccountIds(authConfig, childAccountId, cache),
            getAccountBranchAcl(authConfig, childAccountId, cache)
        ]);

        return {
            accountId: childAccountId,
            childAcl,
            hasChildren: Array.isArray(grandchildIds) && grandchildIds.length > 0
        };
    });

    const hasStructuredChildren = childSummaries.some((summary) => summary.hasChildren);
    const directOwnedLeafIds = hasStructuredChildren
        ? childSummaries.filter((summary) => !summary.hasChildren).map((summary) => summary.accountId)
        : [];

    const managedDescendantIds = await mapWithConcurrency(
        childSummaries.filter((summary) => summary.hasChildren),
        async (summary) => {
            if (summary.childAcl === 'MSPPartner') {
                return getLeafAccountIds(authConfig, summary.accountId, cache);
            }

            return getManagedAccountIds(authConfig, summary.accountId, cache, visited);
        }
    );

    return [...new Set([...directOwnedLeafIds, ...managedDescendantIds.flat()])];
};

export const resolveAccountIds = async (
    authConfig: IAuthConfig,
    options: {
        accountId?: string;
        scope?: string;
        defaultScope?: TAccountScope;
        exactOnAccountId?: boolean;
        cache?: TRequestCache;
    } = {}
): Promise<TResolvedAccountIds> => {
    const hasAccountId = !!options.accountId;
    const scope = getEffectiveScope({
        scope: options.scope,
        defaultScope: options.defaultScope ?? 'account',
        hasAccountId,
        exactOnAccountId: options.exactOnAccountId ?? true
    });
    const baseAccountId = options.accountId || authConfig.keepitGuid;

    if (scope === 'account') {
        return { scope, baseAccountId, accountIds: [baseAccountId] };
    }

    const childAccountIds = await getSubAccountIds(authConfig, baseAccountId, options.cache);
    if (scope === 'children') {
        return { scope, baseAccountId, accountIds: childAccountIds };
    }

    if (scope === 'leaf') {
        return { scope, baseAccountId, accountIds: await getLeafAccountIds(authConfig, baseAccountId, options.cache) };
    }

    if (scope === 'managed') {
        return { scope, baseAccountId, accountIds: await getManagedAccountIds(authConfig, baseAccountId, options.cache) };
    }

    return { scope, baseAccountId, accountIds: [baseAccountId, ...childAccountIds] };
};

export const getAccountsForScope = async (
    authConfig: IAuthConfig,
    options: {
        accountId?: string;
        scope?: string;
        defaultScope?: TAccountScope;
        exactOnAccountId?: boolean;
        cache?: TRequestCache;
        concurrency?: number;
    } = {}
): Promise<TResolvedAccounts> => {
    const resolved = await resolveAccountIds(authConfig, options);
    const uniqueIds = [...new Set(resolved.accountIds)];
    const accounts: IScopedAccount[] = [];
    const warnings: string[] = [];

    const results = await mapWithConcurrency(uniqueIds, async (accountId) => {
        try {
            return {
                account: await getAccountDetails(authConfig, accountId, options.cache),
                warning: null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                account: null,
                warning: `Failed to load account ${accountId}: ${message}`
            };
        }
    }, options.concurrency);

    for (const result of results) {
        if (result?.account) {
            accounts.push(result.account);
        }
        if (result?.warning) {
            warnings.push(result.warning);
        }
    }

    return {
        ...resolved,
        accounts,
        warnings
    };
};

export const findAccountsByQuery = (accounts: IScopedAccount[], query: string): IScopedAccount[] => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return accounts;
    }

    return accounts.filter((account) => {
        const values = [
            account.id,
            account.account_name,
            account.external_id,
            account.product_name
        ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

        return values.some((value) => value.includes(normalizedQuery));
    });
};

export const buildScopeMeta = (
    tool: string,
    resolvedAccounts: TResolvedAccounts,
    extras: Record<string, unknown> = {}
) => ({
    tool,
    ...extras,
    requested_account_id: resolvedAccounts.baseAccountId || null,
    scope: resolvedAccounts.scope,
    resolved_account_ids: resolvedAccounts.accounts.map((account) => account.id)
});
