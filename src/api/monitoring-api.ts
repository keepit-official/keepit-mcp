import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from '../helpers/fast-xml-parser-options.js';
import { getURLSearchParamsString, normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { getNormalizedMonitoringData } from '../helpers/monitoring.helper.js';

const Parser = new XMLParser(xmlParseOptions);

export const getDeviceMonitoringDiagram = (
    userId: string,
    deviceId: string,
    category: TMonitoringDiagramCategory,
    params: IMonitoringDiagramParams
) => {
    const urlQueryParams = getURLSearchParamsString(params);
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/monitoring/${category}/diagrams${urlQueryParams}`
    };

    const applyDataCallback = (response: string) => getNormalizedMonitoringData(response);

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getAggregatedMonitoringDiagram = (
    userId: string,
    params: IAggregatedMonitoringDiagramParams
) => {
    const urlQueryParams = getURLSearchParamsString(params);
    const requestConfig = {
        url: `/users/${userId}/monitoring/snapshot-coverage/diagrams${urlQueryParams}`
    };

    const applyDataCallback = (response: string) => getNormalizedMonitoringData(response);

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getBackupSummarySettings = (
    userId: string,
    deviceId: string,
    params?: IMonitoringBackupSummaryParams
) => {
    const urlQueryParams = getURLSearchParamsString(params);
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/monitoring/backup/summary${urlQueryParams}`
    };

    const applyDataCallback = (response: string) => {
        const jsonData = (Parser.parse(response) as IGetMonitoringBackupSummary)['backup-summary'];

        if (!jsonData) {
            throw new Error('Backup summary data not found in the response');
        }

        return jsonData;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getAggregatedBackupSummarySettings = (
    userId: string,
    params?: IAggregatedBackupSummaryParams
) => {
    const urlQueryParams = getURLSearchParamsString(params);
    const requestConfig = {
        url: `/users/${userId}/monitoring/backup/summary${urlQueryParams}`
    };
    
    const applyDataCallback = (response: string) => {
        const jsonData = (Parser.parse(response) as IGetAggregatedLatestBackupSummary)['backup-summary'].device;

        if (!jsonData) {
            throw new Error('Aggregated backup summary data not found in the response');
        }

        return normalizeArrayResponse(jsonData);
    };

    return {
        requestConfig,
        applyDataCallback
    };
};
