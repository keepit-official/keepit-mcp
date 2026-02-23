import type { Tool } from '@modelcontextprotocol/sdk/types';
import { logger } from '../logger/logger.js';

export type TEaclMethods = 'get' |
    'options' |
    'delete' |
    'head' |
    'post' |
    'put';

type TEaclSingleItem = {
    [key in TEaclMethods]: boolean;
};

export interface IAclObject {
    [key: string]: TEaclSingleItem;
};

export interface IUserACL {
    eacl: string;
    aclObject: IAclObject;
};

export interface IToolRequiredAcl {
    [key: string]: {
        name: string;
        options: TEaclMethods[];
    }[];
};

export const userACL: IUserACL = {
    eacl: '',
    aclObject: {}
};

export const generateEaclPermissions = (eaclAsString: string) => {
    const eaclObject: IAclObject = {};

    eaclAsString.split(':').forEach(function (element) {
        const splitedElement = element.split('/');
        eaclObject[splitedElement[1]] = {
            get: splitedElement[0].includes('G'),
            options: splitedElement[0].includes('O'),
            delete: splitedElement[0].includes('D'),
            head: splitedElement[0].includes('H'),
            post: splitedElement[0].includes('P'),
            put: splitedElement[0].includes('U')
        };
    });

    return eaclObject;
};

export const getAllowedTools = (tools: Tool[], requiredAcl: IToolRequiredAcl): Tool[] => {
    const missedToolsAcl: string[] = [];
    const forbiddenTools: string[] = [];

    const allowedTools = tools.filter(tool => {
        const toolRequiredAcl = requiredAcl[tool.name];

        if (!toolRequiredAcl) {
            missedToolsAcl.push(tool.name);
            return false;
        }
        
        const isAllowed = toolRequiredAcl.every(acl => {
            const checkedAcl = userACL.aclObject[acl.name];

            return !!checkedAcl && acl.options.every(option => checkedAcl[option]);
        });

        if (!isAllowed) {
            forbiddenTools.push(tool.name);
        }

        return isAllowed;
    });

    if (missedToolsAcl.length) {
        logger.error(`Please provide required ACL for tools: ${JSON.stringify(missedToolsAcl)}`);
    }

    if (forbiddenTools.length) {
        logger.info(`You are not allowed to use these tools: ${JSON.stringify(forbiddenTools)}`);
    }

    return allowedTools;
};
