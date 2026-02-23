import 'dotenv/config';

import type { TEnvType } from './environments.helper';
import { getUserId, getUserRole } from '../tools/account/account-tools.helper.js';
import { logger } from '../logger/logger.js';
import { Base64 } from 'js-base64';

export interface IAuthConfig {
    keepitLogin: string;
    keepitPass: string;
    keepitEnv: TEnvType;
    keepitGuid: string;
    sessionId: string;
    userRole: string;
    authToken: string;
};

export const setupAuthConfig = async () => {
    try {
        const tStamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 10);

        const user = process.env.KEEPIT_USER || '';
        const pass = process.env.KEEPIT_PASS || '';
        const authToken = Base64.encode(`${user}:${pass}`);

        const authConfig: IAuthConfig = {
            keepitLogin: user,
            keepitPass: pass,
            keepitEnv: process.env.KEEPIT_ENV as TEnvType || 'unknown',
            sessionId: tStamp + randomPart,
            authToken,
            keepitGuid: '',
            userRole: ''
        };

        authConfig.keepitGuid = await getUserId(authConfig);
        authConfig.userRole = await getUserRole(authConfig);

        // Check for required environment variables
        const { keepitLogin, keepitPass, keepitEnv, keepitGuid } = authConfig;

        logger.info('Environment check:');
        logger.info(`KEEPIT_USER: ${keepitLogin}`);
        logger.info(`KEEPIT_PASS: ${keepitPass ? '[REDACTED]' : 'not set'}`);
        logger.info(`KEEPIT_ENV: ${keepitEnv}`);
        logger.info(`KEEPIT_GUID: ${keepitGuid}`);

        if (!keepitLogin || !keepitPass || !keepitEnv || !keepitGuid) {
            const error = new Error(
                'Missing required environment variables: \n'
                + 'KEEPIT_USER: ' + !!keepitLogin + '; \n'
                + 'KEEPIT_PASS: ' + !!keepitPass + '; \n'
                + 'KEEPIT_ENV: ' + !!keepitEnv + '; \n'
                + 'KEEPIT_GUID: ' + !!keepitGuid + '; \n'
            );
            logger.error(error.message);
            throw error;
        }

        // Build the URL we want
        const keepitUrl = 'https://' + keepitEnv + '.keepit.com/';
        logger.info(`Using base Keepit URL: ${keepitUrl}`);

        return authConfig;
    } catch (error) {
        console.error('Failed to generate auth config:', error);
        throw error;
    }
};
