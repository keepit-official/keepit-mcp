import type { z } from 'zod';
import type { DownloadItemRequestSchema, DownloadZipRequestSchema } from '../../utils/schemas/requests/download.schemas.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { postZipDownload } from '../../api/download-api.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import type { IPostZipDownloadBody } from '../../api/api-types/download-api.js';
import { logger } from '../../logger/logger.js';

type DownloadItemRequest = z.infer<typeof DownloadItemRequestSchema>;
type IDownloadZipRequest = z.infer<typeof DownloadZipRequestSchema>;

const getDownloadUrl = (env: string, pathname: string) => {
    const keepitUrl = 'https://' + env + '.keepit.com/';
    const downloadUrl = new URL(`${pathname}?cd`, keepitUrl);

    return downloadUrl.href;
};

export const getDownloadItemUrl = (authConfig: IAuthConfig, params: DownloadItemRequest) => {
    const downloadUrl = getDownloadUrl(authConfig.keepitEnv, params.url);

    return {
        result: { downloadUrl },
        success: true,
        messages: []
    };
};

export const getDownloadZipUrl = async (authConfig: IAuthConfig, params: IDownloadZipRequest) => {
    try {
        const { deviceId, ...snapshotBody } = params;

        const body: IPostZipDownloadBody = {
            type: 'zip',
            snapshot: { ...snapshotBody }
        };

        const {
            requestConfig,
            applyDataCallback
        } = postZipDownload(authConfig.keepitGuid, deviceId, body);

        const result = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const downloadUrl = getDownloadUrl(authConfig.keepitEnv, result);

        return {
            result: { downloadUrl },
            success: true,
            messages: []
        };
    } catch (error) {
        logger.error(`[DOWNLOAD_ZIP] Error getting zip download url: ${JSON.stringify(error)}`);
        throw error;
    }
};
