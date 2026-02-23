import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface';

const Parser = new XMLParser(xmlParseOptions);

export const getUser = () => {
    const requestConfig: IMakeRequestBaseParams = {
        url: '/users/'
    };

    const applyDataCallback = (response: string) => 
        Parser.parse(response).user.id
    ;

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getUserSettings = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}`
    };

    const applyDataCallback = (response: string): IGetUserResponseObject => 
        Parser.parse(response).user
    ;

    return {
        requestConfig,
        applyDataCallback
    };
};
