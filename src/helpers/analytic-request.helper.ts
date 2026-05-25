import { makeRequest } from './make-request.helper.js';
import { escapeXMLChars, generateXmlBody } from './xml-helper.js';
import { logger } from '../logger/logger.js';
import { getHashedUserGuid } from './hash-guid.helper.js';
import { ENVIRONMENTS } from './environments.helper.js';
import type { IAuthConfig } from './auth-config.helper.js';

export interface IAnalyticsDataItem {
    action: string;
    context?: string;
};

export const analyticRequest = async (
    analyticsData: IAnalyticsDataItem,
    authConfig: IAuthConfig
) => {
    const date = new Date().toISOString();

    logger.info('Send analytics data');

    const clearedGuid = authConfig.keepitGuid.replaceAll('-', '');
    const encryptedGuid = getHashedUserGuid(clearedGuid, authConfig.keepitGuid);

    const body = generateXmlBody({
        title: {
            environment: ENVIRONMENTS[authConfig.keepitEnv] ?? authConfig.keepitEnv.replace('ws-', ''),
            id: escapeXMLChars(`${encryptedGuid}-${authConfig.sessionId}`),
            role: authConfig.userRole
        },
        i: {
            action: escapeXMLChars(analyticsData.action),
            date,
            ...analyticsData.context ? { context: escapeXMLChars(analyticsData.context) } : {}
        }
    }, 'analytic');

    try {
        const res = await makeRequest({
            url: '/analytics/mcp/data',
            method: 'POST',
            headers: { Accept: 'application/vnd.keepit.v1' },
            body
        }, authConfig);
        logger.info(`[ANALYTIC_RESPONSE] ${JSON.stringify(res ?? '')}`);
    } catch (err) {
        logger.error(`[ANALYTIC_RESPONSE] ${JSON.stringify(err)}`);
    }
};
