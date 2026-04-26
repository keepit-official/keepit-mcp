import { getHeaders, makeRequest } from './make-request.helper.js';
import { generateXmlBody } from './xml-helper.js';
import { logger } from '../logger/logger.js';
import { getHashedUserGuid } from './hash-guid.helper.js';
import { ENVIRONMENTS } from './environments.helper.js';
import type { IAuthConfig } from './auth-config.helper.js';

export interface IAnalyticsDataItem {
    action: string;
    context?: string;
};

const isAnalyticsDisabled = () => {
    const value = process.env.KEEPIT_DISABLE_ANALYTICS?.trim().toLowerCase();
    if (!value) {
        return false;
    }

    return value === '1' || value === 'true' || value === 'yes';
};

export const analyticRequest = async (
    analyticsData: IAnalyticsDataItem,
    authConfig: IAuthConfig
) => {
    if (isAnalyticsDisabled()) {
        logger.info('Analytics disabled by KEEPIT_DISABLE_ANALYTICS');
        return;
    }

    const date = new Date().toISOString();

    const item = {
        i: {
            action: analyticsData.action,
            date,
            ...analyticsData.context ? { context: analyticsData.context } : {}
        }
    };

    logger.info('Send analytics data');

    const hashedGuid = getHashedUserGuid(authConfig.keepitGuid);

    const body = generateXmlBody({
        title: {
            environment: ENVIRONMENTS[authConfig.keepitEnv] ?? authConfig.keepitEnv.replace('ws-', ''),
            id: `${hashedGuid}-${authConfig.sessionId}`,
            role: authConfig.userRole
        },
        item
    }, 'analytic');

    try {
        const res = await makeRequest({
            url: '/analytics/mcp/data',
            method: 'POST',
            headers: getHeaders('v1'),
            body
        }, authConfig);
        logger.info(`[ANALYTIC_RESPONSE] ${res ?? ''}`);
    } catch (err) {
        logger.error(`[ANALYTIC_RESPONSE] ${(err as Error).message ?? String(err)}`);
    }
};

export { isAnalyticsDisabled };
