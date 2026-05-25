import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import type { IHeaderResponse, IMakeRequestBaseParams, IMakeRequestHeaderParams } from '../helpers/interfaces/make-request.interface';

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

export const getUserProduct = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/product`
    };

    const applyDataCallback = (response: string): IProduct => {
        return Parser.parse(response).product;
    };

    return {
        requestConfig,
        applyDataCallback
    };
};

export const getSubaccountListItems = (userId: string) => {
    const requestConfig: IMakeRequestHeaderParams = {
        url: `/users/${userId}/users?all=1&include_contact_details=1`,
        headers: { Accept: 'application/vnd.keepit.v3' },
        includeHeaders: true
    };

    const applyDataCallback = (response: IHeaderResponse) => {
        const parsed = Parser.parse(response.data);
        return {
            accounts: normalizeArrayResponse<ISubaccountListItemV3>(parsed?.users?.user),
            accountsTotalCount: response.headers.get('x-total-count') || '0'
        };
    };

    return { requestConfig, applyDataCallback };
};

export const getPortfolioResources = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/portfolio/resources`
    };

    const applyDataCallback = (response: string): IPortfolioResource[] =>
        normalizeArrayResponse(Parser.parse(response)?.resources?.resource);

    return { requestConfig, applyDataCallback };
};

export const getUserResources = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/resources`
    };

    const applyDataCallback = (response: string): IResource[] =>
        normalizeArrayResponse(Parser.parse(response)?.resources?.resource);

    return { requestConfig, applyDataCallback };
};

export const getUserContacts = (userId: string) => {
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/contacts/p`
    };

    const applyDataCallback = (response: string): IContact => Parser.parse(response).contact;

    return {
        requestConfig,
        applyDataCallback
    };
};
