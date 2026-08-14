import { getHeaders } from '../helpers/make-request.helper.js';
import { getURLSearchParamsString, normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from '../helpers/fast-xml-parser-options.js';
import type {
    IDevice,
    IDeviceStatus,
    IAggregatedHealthResponse,
    IAggregatedRsiSummaryParams,
    IAggregatedConnectorsHealthParams,
    IConnectorHealthParams,
    ICriticalDeviceAttributeMap,
    TCriticalDeviceNode
} from './api-types/connectors-api.js';

const Parser = new XMLParser(xmlParseOptions);

export const getConnectors = (userId: string, connectorType: string = 'cloud') => {
    const requestConfig = {
        url: `/users/${userId}/devices`,
        headers: getHeaders('v4')
    };
    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);
        const deviceKey = connectorType;

        const devicesArray = normalizeArrayResponse(jsonData.devices[deviceKey]);

        return devicesArray
            .filter((device: IDevice) => device.accessible)
            .map((device: IDevice) => {

                return {
                    guid: device.guid,
                    name: device.name.substring(0, 200), // Limit name length
                    created: device.created || '',
                    orglink: device.orglink || undefined,
                    type: device.type,
                    ...device['backup-retention'] ? { backup_retention: device['backup-retention'] } : {},
                    ...device['backup-retention-updated'] ? { retention_updated: device['backup-retention-updated'] } : {}
                };
            });
    };

    return { requestConfig, applyDataCallback };
};

export const getConnectorHealth = (userId: string, connectorGUID: string, params?: IConnectorHealthParams) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${connectorGUID}/health${getURLSearchParamsString(params)}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => Parser.parse(response)?.devhealth;

    return { requestConfig, applyDataCallback };
};

export const getAggregatedConnectorsHealthSettings = (userId: string, params: IAggregatedConnectorsHealthParams) => {
    const requestConfig = {
        url: `/users/${userId}/devices/health${getURLSearchParamsString(params)}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response)?.devhealth?.device;

        if (!jsonData) {
            throw new Error('Aggregated connectors health data not found in the response');
        }

        const normalizedArray: IAggregatedHealthResponse[] = normalizeArrayResponse(jsonData);
        return normalizedArray;
    };

    return { requestConfig, applyDataCallback };
};

export const getConnectorRsiSummarySettings = (userId: string, deviceId: string) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/rsi`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response).recurrently_skipped_items;

        if (!jsonData) {
            throw new Error('Recurrently skipped items not found in the response');
        }

        const normalizedResponse = {
            failedFiles: Number(jsonData.rfailed_files),
            failedFolders: Number(jsonData.rfailed_folders)
        };

        return normalizedResponse;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getAggregatedRsiSummarySettings = (userId: string, params?: IAggregatedRsiSummaryParams) => {
    const requestConfig = {
        url: `/users/${userId}/rsi${getURLSearchParamsString(params)}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response).recurrently_skipped_items;

        if (!jsonData) {
            throw new Error('Aggregated recurrently skipped items not found in the response');
        }

        const normalizedResponse = {
            failedFiles: Number(jsonData.rfailed_files),
            failedFolders: Number(jsonData.rfailed_folders)
        };

        return normalizedResponse;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getCriticalConnectorsSettings = (userId: string) => {
    const requestConfig = {
        url: `/users/${userId}/stats/children/partner/critical-devices?children-count=true&sort=%2Baccount-company`
    };

    const applyDataCallback = (response: string): ICriticalDeviceAttributeMap[] => {
        const nodes: TCriticalDeviceNode[] = normalizeArrayResponse(Parser.parse(response).children.node);
        return nodes.map(node =>
            node.data.attribute.reduce((acc, { key, value }) => {
                acc[key] = value.toString();
                return acc;
            }, {} as ICriticalDeviceAttributeMap)
        );
    };

    return { requestConfig, applyDataCallback };
};

export const getDeviceStatus = (userId: string, deviceId: string) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/status`
    };
    const applyDataCallback = (response: string) => {
        const parsedResponse = Parser.parse(response)?.devstatus?.entry;
        let deviceStatus: IDeviceStatus = {
            status: '0'
        };
        if (!parsedResponse) {
            return deviceStatus;
        }
        const responseDevStatusArray = parsedResponse instanceof Array
            ? parsedResponse
            : [parsedResponse];

        if (responseDevStatusArray) {
            deviceStatus = responseDevStatusArray[responseDevStatusArray.length - 1];
            if (responseDevStatusArray[0].adata && responseDevStatusArray[0].adata.ecode) {
                deviceStatus.ecode = responseDevStatusArray[0].adata.ecode;
            }
        }

        return deviceStatus;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};
