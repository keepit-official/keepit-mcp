import type { IHeaderResponse, IMakeRequestHeaderParams } from '../helpers/interfaces/make-request.interface.js';
import { generateXmlBody } from '../helpers/xml-helper.js';
import type { IPostZipDownloadBody } from './api-types/download-api.js';

export const postZipDownload = (userId: string, deviceId: string, downloadConfig: IPostZipDownloadBody) => {
    const requestConfig: IMakeRequestHeaderParams = {
        url: `/users/${userId}/devices/${deviceId}/downloads`,
        method: 'POST',
        body: generateXmlBody(downloadConfig, 'config'),
        includeHeaders: true
    };

    const applyDataCallback = (response: IHeaderResponse) => response.headers.get('location') || '';

    return {
        requestConfig,
        applyDataCallback
    };
};
