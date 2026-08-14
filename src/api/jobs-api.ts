import { getURLSearchParamsString, normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { XMLParser } from 'fast-xml-parser';
import type {
    IDeviceJobsStatutesCountObject,
    IGetWorkloadSuccessfulJobsCountParams,
    IGetDeviceJobsCountParams,
    IGetFilteredJobsBody,
    IJob,
    IWorkloadJobsStatutesCountResponse,
    IWorkloadJobsCountData
} from './api-types/jobs-api.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';
import xmlParseOptions from '../helpers/fast-xml-parser-options.js';
import { generateXmlBody } from '../helpers/xml-helper.js';

const Parser = new XMLParser(xmlParseOptions);

export const getJobs = (userId: string, deviceId: string, activeOnly = false) => {
    const requestConfig = {
        url: `/users/${userId}/devices/${deviceId}/jobs`,
        headers: {
            'Content-Type': 'application/xml',
            'active-jobs-only': `${activeOnly}`
        }
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
    const requestConfig: IMakeRequestBaseParams = {
        method: 'PUT',
        url: `/users/${userId}/devices/${deviceId}/jobs`,
        headers: {
            'Content-Type': 'application/xml'
        },
        body: generateXmlBody(body, 'filter')
    };
    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);
        const jobsFromResponse = jsonData?.jobs?.job ?? [];
        const result: IJob[] = [].concat(jobsFromResponse);

        return {
            result,
            success: true,
            errors: [],
            messages: [`Found ${result.length} job history records`]
        };
    };

    return { requestConfig, applyDataCallback };
};

export const getJobsCountSettings = (
    userId: string,
    deviceId: string,
    params: IGetDeviceJobsCountParams
) => {
    const requestConfig: IMakeRequestBaseParams = {
        method: 'GET',
        url: `/users/${userId}/devices/${deviceId}/jobs/count${getURLSearchParamsString(params)}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const jsonData = Parser.parse(response);

        if (!jsonData) {
            throw new Error('Jobs count items not found in the response');
        }

        const normalizedResponse = normalizeArrayResponse<IDeviceJobsStatutesCountObject>(jsonData['jobs-count']['job-type']);

        return {
            'jobs-count': normalizedResponse
        };
    };

    return { requestConfig, applyDataCallback };
};

export const getAggregatedJobsCountSettings = (
    userId: string,
    params: IGetWorkloadSuccessfulJobsCountParams
) => {
    const requestConfig: IMakeRequestBaseParams = {
        method: 'GET',
        url: `/users/${userId}/jobs/count${getURLSearchParamsString(params)}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string): IWorkloadJobsCountData => {
        const jsonData: IWorkloadJobsStatutesCountResponse = Parser.parse(response);

        if (!jsonData) {
            throw new Error('Aggregated jobs count items not found in the response');
        }

        const normalizedJobsCountData = normalizeArrayResponse(jsonData['jobs-count'].device);

        return {
            'jobs-count': normalizedJobsCountData.map(jobsCountDevice => ({
                ...jobsCountDevice,
                counts: normalizeArrayResponse(jobsCountDevice.counts['job-type'])
            }))
        };
    };

    return { requestConfig, applyDataCallback };
};
