import { getHeaders } from '../helpers/make-request.helper.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { encodePathSegment } from '../helpers/url-path.helper.js';
import { XMLParser } from 'fast-xml-parser';
import type { IGetFilteredJobsBody, IJob } from './api-types/jobs-api.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';
import xmlParseOptions from './fast-xml-parser-options.js';
import { generateXmlBody } from '../helpers/xml-helper.js';

const Parser = new XMLParser(xmlParseOptions);

export const getJobs = (userId: string, deviceId: string, activeOnly = false) => {
    const encodedUserId = encodePathSegment(userId);
    const encodedDeviceId = encodePathSegment(deviceId);
    const requestConfig = {
        url: `/users/${encodedUserId}/devices/${encodedDeviceId}/jobs`,
        headers: getHeaders('v4', { 'active-jobs-only': `${activeOnly}` })
    };
    const applyDataCallback = (response: string): IJob[] => {
        const jsonData = Parser.parse(response);
        const jobs = normalizeArrayResponse(jsonData?.jobs?.job);

        return jobs.map(({ priority, ...rest }) => rest);
    };

    return { requestConfig, applyDataCallback };
};

export const getJobsHistory = (
    userId: string,
    deviceId: string,
    body: IGetFilteredJobsBody
) => {
    const encodedUserId = encodePathSegment(userId);
    const encodedDeviceId = encodePathSegment(deviceId);
    const requestConfig: IMakeRequestBaseParams = {
        method: 'PUT',
        url: `/users/${encodedUserId}/devices/${encodedDeviceId}/jobs`,
        headers: getHeaders('v4'),
        retrySafe: true,
        body: generateXmlBody(body, 'filter')
    };
    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);
        const result = normalizeArrayResponse<IJob>(jsonData?.jobs?.job);

        return {
            result,
            success: true,
            errors: [],
            messages: [`Found ${result.length} job history records`]
        };
    };

    return { requestConfig, applyDataCallback };
};
