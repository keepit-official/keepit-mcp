import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createToolHandler } from '../../helpers/tool.helper.js';
import { getDownloadItemUrl, getDownloadZipUrl } from './download-tools.helper.js';
import type { ToolHandlers } from '../tools.interfaces.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { DownloadItemRequestSchema, DownloadZipRequestSchema } from '../../utils/schemas/requests/download.schemas.js';

export const DOWNLOAD_ITEMS_HANDLER: ToolHandlers = {
    get_download_item_url: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'get_download_item_url',
            toolRequest: request,
            toolHandler: getDownloadItemUrl,
            validationSchema: DownloadItemRequestSchema,
            authConfig
        }),
    get_download_zip_url: async (request: CallToolRequest, authConfig: IAuthConfig) =>
        createToolHandler({
            toolName: 'get_download_zip_url',
            toolRequest: request,
            toolHandler: getDownloadZipUrl,
            validationSchema: DownloadZipRequestSchema,
            authConfig
        })
};
