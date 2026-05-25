import { getHeaders } from '../helpers/make-request.helper.js';
import { logger } from '../logger/logger.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';

const Parser = new XMLParser(xmlParseOptions);

export const getConnectorsSettings = (userId: string, connectorType: string = 'cloud') => {
    const requestConfig = {
        url: `/users/${userId}/devices`,
        headers: getHeaders('v4')
    };
    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);
        const deviceKey = connectorType;

        if (!jsonData.devices?.[deviceKey]) {
            return [];
        }

        const devicesArray = normalizeArrayResponse(jsonData.devices[deviceKey]);

        return devicesArray
            .filter((device: IDevice) => device.accessible !== false)
            .map((device: IDevice) => {
                if (!device.guid || !device.name) {
                    logger.info('[CONNECTORS] Device missing required fields:', device);
                    return null;
                }

                const finalType: TCloudType = device.type === 'dsl' && device['agent-type']
                    ? device['agent-type'] as TCloudType
                    : device.type;

                return {
                    guid: device.guid,
                    name: device.name.substring(0, 200), // Limit name length
                    created: device.created || '',
                    orglink: device.orglink || undefined,
                    type: finalType,
                    ...device['backup-retention'] ? { backup_retention: device['backup-retention'] } : {},
                    ...device['backup-retention-updated'] ? { retention_updated: device['backup-retention-updated'] } : {}
                };
            })
            .filter((device): device is NonNullable<typeof device> => Boolean(device)); // Type-safe filter
    };

    return { requestConfig, applyDataCallback };
};

export const getConnectorHealthSettings = (userId: string, connectorGUID: string) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${connectorGUID}/health`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);

        const healthStatus = jsonData?.devhealth?.health
            ? normalizeArrayResponse(jsonData.devhealth.health)[0]
            : normalizeArrayResponse(jsonData?.health)[0];

        if (!healthStatus) {
            logger.error('[CONNECTOR_HEALTH] Health status not found in response:', jsonData);
            throw new Error('Health status not found in the response');
        }

        const validStatuses = ['healthy', 'unhealthy', 'critical'];
        const normalizedStatus = String(healthStatus).toLowerCase();
        if (!validStatuses.includes(normalizedStatus)) {
            logger.info(`[CONNECTOR_HEALTH] Unexpected health status: ${healthStatus}`);
            return 'unknown';
        }

        return normalizedStatus;
    };

    return { requestConfig, applyDataCallback };
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
