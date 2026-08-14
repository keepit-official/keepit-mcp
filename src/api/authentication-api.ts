import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from '../helpers/fast-xml-parser-options.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';

const Parser = new XMLParser(xmlParseOptions);

export const getTokens = <
    B extends IGetTokensParams | undefined = undefined,
    R = B extends IGetTokensParams ? B['capabilities'] extends 1 ? IAuthToken : IAuthTokenShort : IAuthTokenShort
>(userId: string, params?: B | undefined) => {
    let paramString = '';
    if (params) {
        const searchParams = new URLSearchParams(params as Record<string, string>);
        paramString = '?' + searchParams.toString();
    }
    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/tokens${paramString}`,
        method: 'GET',
        headers: { Accept: 'application/vnd.keepit.v2' }
    };

    const applyDataCallback = (response: string) => {
        return normalizeArrayResponse(Parser.parse(response).tokens.token) as R[];
    };

    return { requestConfig, applyDataCallback };
};
