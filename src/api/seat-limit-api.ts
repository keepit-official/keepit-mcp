import { generateXmlBody } from '../helpers/xml-helper.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';

const Parser = new XMLParser(xmlParseOptions);

export const WORKLOAD_TYPES = [
    'o365-admin',
    'gsuite',
    'salesforce',
    'azuread',
    'azuredo',
    'dynamics365',
    'powerbi',
    'zendesk',
    'okta',
    'jira',
    'confluence',
    'bamboohr',
    'docusign',
    'miro'
] as const;

export const putTotalUserUsage = (userId: string, timeRange: { from: string; to: string; }) => {
    const body = {
        range: {
            from: timeRange.from,
            to: timeRange.to
        },
        'include-account-type': 'true'
    };

    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/resources/max_usage/total`,
        method: 'PUT',
        body: generateXmlBody(body, 'filter')
    };

    const applyDataCallback = (response: string): ITotalUsageRaw => {
        return Parser.parse(response).total;
    };

    return { requestConfig, applyDataCallback };
};

export const putMaxUsage = (userId: string, timeRange: { from: string; to: string; }) => {
    const body = {
        range: {
            from: timeRange.from,
            to: timeRange.to
        }
    };

    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/resources/max_usage`,
        method: 'PUT',
        body: generateXmlBody(body, 'filter')
    };

    const applyDataCallback = (response: string): IMaxUsageResourceRaw[] => {
        const parsed = Parser.parse(response);
        return normalizeArrayResponse(parsed.resources?.resource);
    };

    return { requestConfig, applyDataCallback };
};

export const putUserUsageHistory = (userId: string, timeRange: { from: string; to: string; }) => {
    const body = {
        range: {
            from: timeRange.from,
            to: timeRange.to
        },
        billable: 'true',
        'show-aggregations': 'true'
    };

    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/resources/history`,
        method: 'PUT',
        body: generateXmlBody(body, 'filter')
    };

    const applyDataCallback = (response: string): IUsageHistorySnapshotRaw[] => {
        const parsed = Parser.parse(response);
        return normalizeArrayResponse(parsed.history?.entry);
    };

    return { requestConfig, applyDataCallback };
};

export const putUserExpirationsSettings = (userId: string, connectorTypes?: TWorkloadsType[]) => {
    const groups = connectorTypes && connectorTypes.length > 0 ? connectorTypes : [...WORKLOAD_TYPES];
    const body = {
        or: {
            'resources-violation': {
                'resource-group': groups
            }
        }
    };

    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/expirations`,
        method: 'PUT',
        body: generateXmlBody(body, 'filter')
    };

    const applyDataCallback = (response: string): ISeatLimitAccountRaw[] => {
        const parsed = Parser.parse(response);

        return normalizeArrayResponse(parsed.subaccounts?.account);
    };

    return { requestConfig, applyDataCallback };
};
