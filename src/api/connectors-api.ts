import { getHeaders } from '../helpers/make-request.helper.js';
import { logger } from '../logger/logger.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { encodePathSegment } from '../helpers/url-path.helper.js';
import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';

const Parser = new XMLParser(xmlParseOptions);

export const getConnectorsSettings = (userId: string, connectorType: string = 'cloud') => {
    const encodedUserId = encodePathSegment(userId);
    const requestConfig = {
        url: `/users/${encodedUserId}/devices`,
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
                    logger.warn('[CONNECTORS] Device missing required fields:', device);
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
    const encodedUserId = encodePathSegment(userId);
    const encodedConnectorGuid = encodePathSegment(connectorGUID);
    const requestConfig = {
        url: `/users/${encodedUserId}/devices/${encodedConnectorGuid}/health`,
        headers: getHeaders('v4')
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
            logger.warn(`[CONNECTOR_HEALTH] Unexpected health status: ${healthStatus}`);
            return 'unknown';
        }

        return normalizedStatus;
    };

    return { requestConfig, applyDataCallback };
};
