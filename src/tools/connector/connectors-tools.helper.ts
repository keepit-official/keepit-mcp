/**
 * Connector tool orchestration layer.
 *
 * This module validates connector-oriented arguments, resolves scope-aware
 * connector candidates, and provides shared connector discovery and health
 * lookup helpers for connector, jobs, and snapshot tools.
 */
import { ConnectorByGuidRequestSchema, ConnectorHealthRequestSchema, ConnectorListRequestSchema } from '../../utils/schemas/requests/connector.schemas.js';
import { getConnectorHealthSettings, getConnectorsSettings } from '../../api/connectors-api.js';
import { buildScopeMeta, getAccountsForScope, mapWithConcurrency, memoizeRequest } from '../account/account-context.helper.js';
import { CONNECTOR_TYPE_LABELS } from '../../helpers/connector-types.helper.js';
import { logger } from '../../logger/logger.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { parseToolArgsOrThrow } from '../../helpers/tool.helper.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import type { ToolParams, ToolResult } from '../tools.interfaces.js';
import type { z } from 'zod';

type ConnectorByGuidRequest = z.infer<typeof ConnectorByGuidRequestSchema>;
type ConnectorHealthRequest = z.infer<typeof ConnectorHealthRequestSchema>;
type ConnectorListRequest = z.infer<typeof ConnectorListRequestSchema>;
export type IScopedConnector = IConnector & {
    account_id: string;
    account_name: string | null;
    type_label?: string | null;
};

const normalizeConnectorTarget = (value: unknown): string | undefined => 
    typeof value === 'string' && value.trim() ? value.trim() : undefined
;

export const parseScopedConnectorArgs = (toolParams?: ToolParams, options: { requireTarget?: boolean; } = {}) => {
    const argumentsObject = toolParams?.arguments || {};
    const guid = normalizeConnectorTarget(argumentsObject.guid);
    const connector_name = normalizeConnectorTarget(argumentsObject.connector_name ?? argumentsObject.name);
    const query = normalizeConnectorTarget(argumentsObject.query);
    const providedTargets = [guid, connector_name, query].filter(Boolean);

    if (providedTargets.length > 1) {
        throw new Error('Provide only one of guid, connector_name, or query.');
    }

    if (options.requireTarget && providedTargets.length === 0) {
        throw new Error('Provide exactly one connector target using guid, connector_name, or query.');
    }

    return {
        guid,
        connector_name,
        query,
        account_id: normalizeConnectorTarget(argumentsObject.account_id),
        scope: normalizeConnectorTarget(argumentsObject.scope)
    };
};

export const getValidatedConnectorByGuidArguments = (toolParams: ToolParams): ConnectorByGuidRequest => {
    return parseToolArgsOrThrow(ConnectorByGuidRequestSchema, {
        guid: toolParams.arguments?.guid,
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope
    });
};

export const getValidatedConnectorListArguments = (toolParams: ToolParams): ConnectorListRequest => {
    return parseToolArgsOrThrow(ConnectorListRequestSchema, {
        account_id: toolParams.arguments?.account_id,
        scope: toolParams.arguments?.scope,
        query: toolParams.arguments?.query
    });
};

export const getValidatedConnectorHealthArguments = (toolParams: ToolParams): ConnectorHealthRequest => {
    const parsed = parseScopedConnectorArgs(toolParams, { requireTarget: true });
    return parseToolArgsOrThrow(ConnectorHealthRequestSchema, parsed);
};

const getConnectorsForAccount = async (
    authConfig: IAuthConfig,
    account: { id: string; account_name: string | null; },
    cache?: Map<string, Promise<unknown>>
): Promise<IScopedConnector[]> => {
    return memoizeRequest(cache, `connectors:${account.id}`, async () => {
        const { requestConfig, applyDataCallback } = getConnectorsSettings(account.id);
        const connectors = await makeRequest<IConnector[]>(requestConfig, authConfig, applyDataCallback);
        return connectors.map((connector) => ({
            ...connector,
            account_id: account.id,
            account_name: account.account_name,
            type_label: connector.type ? CONNECTOR_TYPE_LABELS[connector.type] ?? null : null
        }));
    });
};

export const getScopedConnectors = async (
    authConfig: IAuthConfig,
    options: {
        accountId?: string;
        account_id?: string;
        scope?: string;
        defaultScope?: 'account' | 'children' | 'leaf' | 'managed' | 'all';
        exactOnAccountId?: boolean;
        cache?: Map<string, Promise<unknown>>;
        concurrency?: number;
        resolvedAccounts?: Awaited<ReturnType<typeof getAccountsForScope>>;
    } = {}
) => {
    const accountId = options.accountId ?? options.account_id;
    const resolvedAccounts = options.resolvedAccounts ?? await getAccountsForScope(authConfig, {
        accountId,
        scope: options.scope,
        defaultScope: options.defaultScope ?? 'all',
        exactOnAccountId: options.exactOnAccountId ?? true,
        cache: options.cache,
        concurrency: options.concurrency
    });

    const connectors: IScopedConnector[] = [];
    const warnings = [...resolvedAccounts.warnings];

    const results = await mapWithConcurrency(resolvedAccounts.accounts, async (account) => {
        try {
            return {
                connectors: await getConnectorsForAccount(authConfig, account, options.cache),
                warning: null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                connectors: [] as IScopedConnector[],
                warning: `Failed to load connectors for account ${account.id}: ${message}`
            };
        }
    }, options.concurrency);

    for (const result of results) {
        connectors.push(...result?.connectors || []);
        if (result?.warning) {
            warnings.push(result.warning);
        }
    }

    return { connectors, warnings, resolvedAccounts };
};

const filterConnectors = (connectors: IScopedConnector[], query?: string): IScopedConnector[] => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return connectors;
    }

    return connectors.filter((connector) => {
        const values = [
            connector.guid,
            connector.name,
            connector.account_id,
            connector.account_name
        ].filter(Boolean).map((value) => String(value).toLowerCase());
        return values.some((value) => value.includes(normalizedQuery));
    });
};

export const resolveConnectorGuidFromConnectors = (
    request: { guid?: string; name?: string; connector_name?: string; query?: string; },
    connectors: Array<{ guid: string; name: string; }>
): string => {
    if (request.guid) {
        return request.guid;
    }

    const query = (request.connector_name ?? request.name ?? request.query)?.trim().toLowerCase();
    if (!query) {
        throw new Error('Either connector guid or name is required');
    }

    const exactMatch = connectors.find((connector) => connector.name.toLowerCase() === query);
    if (exactMatch) {
        return exactMatch.guid;
    }

    const partialMatches = connectors.filter((connector) => connector.name.toLowerCase().includes(query));
    if (partialMatches.length === 1) {
        return partialMatches[0].guid;
    }

    if (partialMatches.length > 1) {
        throw new Error(`Connector name "${request.connector_name ?? request.name ?? request.query}" is ambiguous. Matches: ${partialMatches.map((connector) => connector.name).join(', ')}`);
    }

    throw new Error(`Connector name "${request.connector_name ?? request.name ?? request.query}" was not found`);
};

export const getConnectors = async (
    authConfig: IAuthConfig,
    options: ConnectorListRequest = {}
): Promise<ToolResult<IScopedConnector[]>> => {
    try {
        const scoped = await getScopedConnectors(authConfig, {
            accountId: options.account_id,
            scope: options.scope,
            defaultScope: 'all',
            exactOnAccountId: true
        });

        return {
            result: scoped.connectors,
            success: true,
            messages: [`Found ${scoped.connectors.length} connectors`].concat(scoped.warnings),
            meta: buildScopeMeta('get_cloud_connectors', scoped.resolvedAccounts)
        } as ToolResult<IScopedConnector[]> & { meta: Record<string, unknown>; };
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors:', error);
        throw error;
    }
};

export const findConnectors = async (
    authConfig: IAuthConfig,
    options: ConnectorListRequest & { query?: string; guid?: string; connector_name?: string; } = {}
): Promise<ToolResult<IScopedConnector[]>> => {
    const scoped = await getScopedConnectors(authConfig, {
        accountId: options.account_id,
        scope: options.scope,
        defaultScope: 'all',
        exactOnAccountId: true
    });

    const query = options.guid ?? options.connector_name ?? options.query;
    const connectors = options.guid
        ? scoped.connectors.filter((connector) => connector.guid === options.guid)
        : filterConnectors(scoped.connectors, query);

    return {
        result: connectors,
        success: true,
        messages: [`Found ${connectors.length} matching connectors`].concat(scoped.warnings),
        meta: buildScopeMeta('find_connector', scoped.resolvedAccounts, { query: query || null })
    } as ToolResult<IScopedConnector[]> & { meta: Record<string, unknown>; };
};

export const resolveConnector = async (
    authConfig: IAuthConfig,
    options: { guid?: string; connector_name?: string; query?: string; account_id?: string; scope?: string; }
): Promise<IScopedConnector> => {
    const query = options.guid || options.connector_name || options.query;
    const { result: connectors } = await findConnectors(authConfig, {
        ...(options as ConnectorListRequest & { guid?: string; connector_name?: string; query?: string; }),
        query
    });

    if (connectors.length === 0) {
        throw new Error(`No connector found for "${query}". Check the connector name/GUID, or widen the scope.`);
    }

    if (connectors.length > 1) {
        const candidates = connectors
            .slice(0, 5)
            .map((connector) => `${connector.name} (${connector.guid}) on ${connector.account_id}`)
            .join(', ');
        throw new Error(`Multiple connectors match "${query}". Candidates: ${candidates}`);
    }

    return connectors[0];
};

export const resolveScopedConnector = async (
    request: ConnectorHealthRequest,
    authConfig: IAuthConfig
): Promise<IScopedConnector> => {
    return resolveConnector(authConfig, {
        guid: request.guid,
        connector_name: request.connector_name ?? request.name,
        query: request.query,
        account_id: request.account_id,
        scope: request.scope
    });
};

export const getConnectorByGuid = async (
    authConfig: IAuthConfig,
    options: ConnectorByGuidRequest
): Promise<ToolResult<IScopedConnector>> => {
    try {
        const scoped = await getScopedConnectors(authConfig, {
            accountId: options.account_id,
            scope: options.scope,
            defaultScope: 'all',
            exactOnAccountId: true
        });

        const connector = scoped.connectors.find((c) => c.guid === options.guid);
        if (!connector) {
            throw new Error(`Connector with GUID "${options.guid}" not found. Verify the GUID or widen the scope.`);
        }

        logger.info(`[CONNECTOR] Resolved connector by GUID: ${connector.guid} on ${connector.account_id}`);

        return {
            result: connector,
            success: true,
            messages: [`Found connector "${connector.name}" (${connector.guid})`].concat(scoped.warnings),
            meta: buildScopeMeta('get_connector', scoped.resolvedAccounts, { guid: options.guid })
        } as ToolResult<IScopedConnector> & { meta: Record<string, unknown>; };
    } catch (error) {
        logger.error('[CONNECTOR] Error getting connector by GUID:', error);
        throw error;
    }
};

export const getConnectorHealth = async (
    request: ConnectorHealthRequest,
    authConfig: IAuthConfig
): Promise<{ connector: IScopedConnector; health: string; }> => {
    try {
        const connector = await resolveScopedConnector(request, authConfig);
        logger.info(`[CONNECTOR_HEALTH] Getting health for connector: ${connector.guid} on ${connector.account_id}`);

        const { requestConfig, applyDataCallback } = getConnectorHealthSettings(connector.account_id, connector.guid);
        const connectorHealth = await makeRequest<string>(requestConfig, authConfig, applyDataCallback);

        return {
            connector,
            health: connectorHealth
        };
    } catch (error) {
        logger.error('[CONNECTORS] Error getting connectors health:', error);
        throw error;
    }
};
