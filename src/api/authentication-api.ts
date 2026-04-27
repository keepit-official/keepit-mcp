import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from '../api/fast-xml-parser-options.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { encodePathSegment } from '../helpers/url-path.helper.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';

const Parser = new XMLParser(xmlParseOptions);

export const getTokens = <
    B extends IGetTokensParams | undefined = undefined,
    R = B extends IGetTokensParams ? B['capabilities'] extends 1 ? IAuthToken : IAuthTokenShort : IAuthTokenShort
>(userId: string, params?: B | undefined) => {
    const encodedUserId = encodePathSegment(userId);
    let paramString = '';
    if (params) {
        const searchParams = new URLSearchParams(params as Record<string, string>);
        paramString = '?' + searchParams.toString();
    }
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${encodedUserId}/tokens${paramString}`,
        method: 'GET',
        headers: { Accept: 'application/vnd.keepit.v2' }
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        if (!parsed?.tokens) {
            throw new Error('Unexpected response from tokens endpoint — could not resolve user role. Check your credentials and region.');
        }
        return normalizeArrayResponse(parsed.tokens.token) as R[];
    };

    return { requestConfig, applyDataCallback };
};

export const getTokenByGuid = (userId: string, tokenGuid: string) => {
    const encodedUserId = encodePathSegment(userId);
    const encodedTokenGuid = encodePathSegment(tokenGuid);
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${encodedUserId}/tokens/${encodedTokenGuid}`,
        method: 'GET',
        headers: { Accept: 'application/xml' }
    };

    const applyDataCallback = (response: string) => {
        const parsed = Parser.parse(response);
        const tokens = normalizeArrayResponse(parsed?.tokens?.token);
        return tokens[0] || null;
    };

    return { requestConfig, applyDataCallback };
};
