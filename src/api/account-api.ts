import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { generateXmlBody } from '../helpers/xml-helper.js';
import { getHeaders } from '../helpers/make-request.helper.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface';

const Parser = new XMLParser(xmlParseOptions);

export const getUser = () => {
    const requestConfig: IMakeRequestBaseParams = {
        url: '/users/'
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        if (!parsed?.user?.id) {
            throw new Error('Unexpected response from /users/ — could not resolve user ID. Check your credentials and region.');
        }
        return parsed.user.id;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getUserSettings = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}`
    };

    const applyDataCallback = (response: string): IGetUserResponseObject => {
        const parsed = Parser.parse(response);
        if (!parsed?.user) {
            throw new Error('Unexpected response from /users/{id} — could not retrieve user settings.');
        }
        return parsed.user;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getSubAccountsList = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/users`
    };

    const applyDataCallback = (response: string): string[] => {
        const parsed = Parser.parse(response);
        const rawItems = parsed?.users?.user ?? parsed?.users?.id ?? [];

        return normalizeArrayResponse(rawItems)
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
                    return item.id;
                }

                return undefined;
            })
            .filter((item): item is string => Boolean(item));
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getPrimaryContact = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/contacts/p`
    };

    const applyDataCallback = (response: string): IPrimaryContactResponseObject | null => {
        const parsed = Parser.parse(response);
        return parsed?.contact ?? null;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getAccountPortfolio = (accountId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/portfolio`
    };

    const applyDataCallback = (response: string): Array<{ id: string | null; name: string | null; }> => {
        const parsed = Parser.parse(response);
        const products = normalizeArrayResponse(parsed?.portfolio?.product ?? []);
        return products.map((product) => ({
            id: product?.id || null,
            name: product?.name || null
        }));
    };

    return { requestConfig, applyDataCallback };
};

export const getAccountMfaStatus = (accountId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/mfa`
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        const rulesContainer = parsed?.mfa?.rules ?? {};
        const rulesNode = rulesContainer?.and ?? rulesContainer?.or ?? {};
        const factorNames = Object.keys(rulesNode || {})
            .filter((key) => !['#text', 'text'].includes(String(key).toLowerCase()))
            .map((key) => String(key).trim().toLowerCase())
            .filter(Boolean);

        return {
            enabled: parsed?.mfa?.enabled === true || parsed?.mfa?.enabled === 'true',
            totp: factorNames.includes('totp'),
            trusted_ips: factorNames.includes('trustedips') || factorNames.includes('trusted_ips') || factorNames.includes('trustedip') || factorNames.includes('trusted_ip')
        };
    };

    return { requestConfig, applyDataCallback };
};

export const getAccountSsoStatus = (accountId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/ssoconfig`
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        const rawConfigurations = normalizeArrayResponse(parsed?.configurations?.configuration ?? []);
        const configurations = rawConfigurations.map((configuration) => ({
            guid: configuration?.guid || null,
            name: configuration?.name || null,
            idp_url: configuration?.idp_url || null,
            enabled: configuration?.enabled === true || configuration?.enabled === 'true',
            apply_self: configuration?.apply_self === true || configuration?.apply_self === 'true',
            apply_subaccounts: configuration?.apply_subaccounts === true || configuration?.apply_subaccounts === 'true',
            allow_idp: configuration?.allow_idp === true || configuration?.allow_idp === 'true',
            optional: configuration?.optional === true || configuration?.optional === 'true'
        }));

        return {
            enabled: configurations.length > 0,
            configurations
        };
    };

    return { requestConfig, applyDataCallback };
};

export const getUserMfaStatus = (accountId: string, username: string) => {
    const encodedUsername = encodeURIComponent(username);
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/mfa/${encodedUsername}/status`
    };

    const applyDataCallback = (response: string): Array<{ id: string | null; status: string | null; }> => {
        const parsed = Parser.parse(response);
        const rules = normalizeArrayResponse(parsed?.rules?.rule ?? []);
        return rules.map((rule) => ({
            id: rule.id || null,
            status: rule.status || null
        }));
    };

    return { requestConfig, applyDataCallback };
};

export const getTokenAttributes = (accountId: string, username: string) => {
    const encodedUsername = encodeURIComponent(username);
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/tokens/${encodedUsername}/attributes`
    };

    const applyDataCallback = (response: string): Array<{ name: string | null; value: string | null; }> => {
        const parsed = Parser.parse(response);
        const attributes = normalizeArrayResponse(parsed?.attributes?.attribute ?? []);
        return attributes.map((attribute) => ({
            name: attribute?.name || null,
            value: attribute?.value ?? null
        }));
    };

    return { requestConfig, applyDataCallback };
};

export const getAccountResources = (accountId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/resources`
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        const resources = normalizeArrayResponse(parsed?.resources?.resource ?? []);
        return resources.map((resource) => ({
            evaluated: resource?.evaluated || null,
            name: resource?.name || null,
            type: resource?.type || null,
            unit: resource?.unit || null,
            usage: resource?.usage ?? null,
            limit: resource?.limit ?? null,
            violated: resource?.violated === true || resource?.violated === 'true'
        }));
    };

    return { requestConfig, applyDataCallback };
};

export const getAccountMaxUsageTotal = (
    accountId: string,
    filter: Record<string, unknown>
) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${accountId}/resources/max_usage/total`,
        method: 'PUT',
        headers: getHeaders('v4'),
        retrySafe: true,
        body: generateXmlBody(filter, 'filter')
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        return {
            seats_count: parsed?.total?.['seats-count'] ?? 0,
            connectors_count: parsed?.total?.['connectors-count'] ?? 0,
            account_type: parsed?.total?.['account-type'] ?? null
        };
    };

    return { requestConfig, applyDataCallback };
};
