import type { IHeaderResponse, IMakeRequestBaseParams, IMakeRequestHeaderParams, TApplyDataCallbackFn, VersionString } from './interfaces/make-request.interface.js';
import type { IAuthConfig } from './auth-config.helper.js';

const KEEPIT_DOMAIN = '.keepit.com';

function makeRequest(
    requestConfig: IMakeRequestBaseParams,
    authConfig: IAuthConfig,
    applyDataCallback?: undefined
): Promise<string>;
function makeRequest<T>(
    requestConfig: IMakeRequestBaseParams,
    authConfig: IAuthConfig,
    applyDataCallback?: TApplyDataCallbackFn<string, T>
): Promise<T>;
function makeRequest<T>(
    requestConfig: IMakeRequestHeaderParams,
    authConfig: IAuthConfig,
    applyDataCallback?: TApplyDataCallbackFn<IHeaderResponse, T>
): Promise<T>;
async function makeRequest<T>(
    requestConfig: IMakeRequestBaseParams | IMakeRequestHeaderParams,
    authConfig: IAuthConfig,
    applyDataCallback?: TApplyDataCallbackFn<string, T> | TApplyDataCallbackFn<IHeaderResponse, T>
): Promise<T | string> {
    const url = `https://${authConfig.keepitEnv}${KEEPIT_DOMAIN}${requestConfig.url}`;
    let errorCode;
    let errorHeaders;
    let response: Response | undefined;

    try {
        response = await fetch(
            url,
            {
                method: requestConfig.method ?? 'GET',
                headers: {
                    ...requestConfig.headers,
                    ...{ Authorization: `Basic ${authConfig.authToken}` }
                },
                ...requestConfig.body && { body: requestConfig.body }
            }
        );

        if (response.ok) {
            const data = await response.text();
            if (requestConfig.includeHeaders && applyDataCallback) {
                return (applyDataCallback as TApplyDataCallbackFn<IHeaderResponse, T>)({
                    data,
                    headers: response.headers
                });
            }

            return applyDataCallback
                ? (applyDataCallback as TApplyDataCallbackFn<string, T>)(data)
                : data;
        } else {
            const errorFromResponse = await response.text();
            errorCode = response.status;
            errorHeaders = response.headers;

            throw new Error(errorFromResponse);
        }
    } catch (error) {
        throw new MakeRequestErrorException(
            (error as Error).message,
            errorCode || 500,
            errorHeaders || new Headers()
        );
    }
};

class MakeRequestErrorException {
    constructor(
        public readonly message: string,
        public readonly code: number,
        public readonly headers: Headers
    ) { }
}

const getHeaders = (version: VersionString, extraHeaders: HeadersInit = {}) => {
    return {
        ...extraHeaders,
        'Content-Type': 'application/xml',
        'Accept': `application/vnd.keepit.${version}+xml`
    };
};

export {
    getHeaders,
    makeRequest,
    MakeRequestErrorException
};
