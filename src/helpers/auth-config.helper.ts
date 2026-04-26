import 'dotenv/config';

import crypto from 'crypto';
import type { TEnvType } from './environments.helper';
import type { IUserACL } from './acl.helper.js';
import { getUserId, getUserRole } from '../tools/account/account-tools.helper.js';
import { logger } from '../logger/logger.js';
import { Base64 } from 'js-base64';
import { validateEnvironment } from './validations.helper.js';

export interface IAuthConfig {
    keepitLogin: string;
    keepitEnv: TEnvType;
    keepitGuid: string;
    sessionId: string;
    userRole: string;
    authToken: string;
    userAcl: IUserACL;
};

const TEST_HARNESS_ACL_NAMES = [
    'User',
    'SsoConfigs',
    'Tokens',
    'ResourcesUsage',
    'Devices',
    'Resources',
    'DevHealth',
    'AuditFilter',
    'DevJobs',
    'History'
] as const;

const createTestHarnessAuthConfig = (): IAuthConfig => ({
    keepitLogin: 'test-harness',
    keepitEnv: 'au-sy',
    sessionId: crypto.randomUUID(),
    authToken: Base64.encode('test-harness:test-harness'),
    keepitGuid: 'test-harness-account',
    userRole: 'TestHarness',
    userAcl: {
        eacl: '',
        aclObject: Object.fromEntries(TEST_HARNESS_ACL_NAMES.map((name) => [name, {
            get: true,
            options: true,
            delete: true,
            head: true,
            post: true,
            put: true
        }]))
    }
});

function validateStartupEnvironment(
    keepitLogin: string,
    keepitPass: string,
    keepitEnv: string
) {
    const missing = [
        !keepitLogin ? 'KEEPIT_USER' : '',
        !keepitPass ? 'KEEPIT_PASS' : '',
        !keepitEnv ? 'KEEPIT_ENV' : ''
    ].filter(Boolean);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

export const setupAuthConfig = async () => {
    try {
        if (process.env.NODE_ENV === 'test' && process.env.KEEPIT_MCP_MOCK_AUTH === '1') {
            const authConfig = createTestHarnessAuthConfig();
            validateEnvironment(authConfig);
            logger.info('Using test harness auth configuration');
            return authConfig;
        }

        const user = process.env.KEEPIT_USER || '';
        const pass = process.env.KEEPIT_PASS || '';
        const keepitEnv = process.env.KEEPIT_ENV || '';
        const authToken = Base64.encode(`${user}:${pass}`);

        validateStartupEnvironment(user, pass, keepitEnv);
        // Remove the plaintext password from the environment immediately after encoding so it
        // is not accessible to any code or child processes that inspect process.env later.
        delete process.env.KEEPIT_PASS;

        const authConfig: IAuthConfig = {
            keepitLogin: user,
            keepitEnv: keepitEnv as TEnvType,
            sessionId: crypto.randomUUID(),
            authToken,
            keepitGuid: '',
            userRole: '',
            userAcl: {
                eacl: '',
                aclObject: {}
            }
        };

        validateEnvironment(authConfig);

        authConfig.keepitGuid = await getUserId(authConfig);
        authConfig.userRole = await getUserRole(authConfig);

        const { keepitLogin, keepitGuid } = authConfig;

        logger.info('Environment check completed', {
            keepitUserConfigured: !!keepitLogin,
            keepitPassConfigured: !!pass,
            keepitEnv,
            keepitGuidConfigured: !!keepitGuid
        });

        if (!keepitGuid) {
            const error = new Error('Failed to resolve KEEPIT_GUID from the authenticated Keepit user.');
            logger.error(error.message);
            throw error;
        }

        return authConfig;
    } catch (error) {
        logger.error('Failed to generate auth config:', error);
        throw error;
    }
};
