import { generateXmlBody } from '../helpers/xml-helper.js';
import { getHeaders } from '../helpers/make-request.helper.js';
import { getStringValue } from '../helpers/validations.helper.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { XMLParser } from 'fast-xml-parser';
import type { IDeviceSnapshot, IGetDeviceRangeBody } from './api-types/snapshot-api.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';
import xmlParseOptions from './fast-xml-parser-options.js';

const Parser = new XMLParser(xmlParseOptions);

export const getLatestSnapshot = (userId: string, deviceId: string) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/history/latest`,
        headers: getHeaders('v1')
    };
    const applyDataCallback = (response: string): IDeviceSnapshot | null => {
        const parsed = Parser.parse(response);

        if (!parsed) return null;

        if (parsed?.history?.backup) return parsed.history.backup;
        if (parsed?.root?.history?.backup) return parsed.root.history.backup;
        if (parsed?.backup) return parsed.backup;
        if (parsed?.root?.backup) return parsed.root.backup;
        if (parsed?.snapshots?.snapshot) return parsed.snapshots.snapshot;

        return null;
    };

    return { requestConfig, applyDataCallback };
};

export const getSnapshotRange = (
    userId: string,
    deviceId: string,
    body: IGetDeviceRangeBody
) => {
    const requestConfig: IMakeRequestBaseParams = {
        method: 'PUT',
        url: `/users/${userId}/devices/${deviceId}/history/range`,
        headers: getHeaders('v4'),
        retrySafe: true,
        body: generateXmlBody({
            ...body,
            count: body.count ?? 99
        }, 'range')
    };
    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);

        let snapshots: IDeviceSnapshot[] = [];
        if (parsed?.history?.backup) {
            snapshots = normalizeArrayResponse(parsed.history.backup);
        } else if (parsed?.root?.history?.backup) {
            snapshots = normalizeArrayResponse(parsed.root.history.backup);
        } else if (parsed?.backup) {
            snapshots = normalizeArrayResponse(parsed.backup);
        } else if (parsed?.root?.backup) {
            snapshots = normalizeArrayResponse(parsed.root.backup);
        }

        const result = snapshots.map((snapshot) => {
            const timestamp = getStringValue(snapshot.tstamp) || 'Unknown';
            const type = getStringValue(snapshot.type) || 'Unknown';
            const size = getStringValue(snapshot.size) || 'Unknown';
            const account = getStringValue(snapshot.account) || 'Unknown';

            return {
                timestamp,
                type,
                size,
                account
            };
        }).filter((snapshot) => snapshot.timestamp !== 'Unknown');

        return result;
    };

    return { requestConfig, applyDataCallback };
};

