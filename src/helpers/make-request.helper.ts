import type { IHeaderResponse, IMakeRequestBaseParams, IMakeRequestHeaderParams, TApplyDataCallbackFn, VersionString } from './interfaces/make-request.interface';
import type { IAuthConfig } from './auth-config.helper';

const KEEPIT_DOMAIN = '.keepit.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_SAFE_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);
const RETRYABLE_ERROR_NAMES = new Set(['TimeoutError', 'AbortError', 'TypeError']);

const getRetryDelayMs = (attempt: number) => {
    return 300 * 2 ** attempt;
};

const delay = async (ms: number) => {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

const isRetryableMethod = (method?: string) => {
    const normalizedMethod = (method ?? 'GET').toUpperCase();
    return normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
};

const shouldRetryRequest = (
    method: string | undefined,
    retrySafe: boolean | undefined,
    attempt: number,
    errorCode?: number,
    errorName?: string
) => {
    // Retry is allowed only when the request is safe to repeat: either (a) the method is GET/HEAD
    // (implicitly idempotent) or (b) the caller has explicitly set retrySafe=true for a PUT/POST
    // that is idempotent in context (e.g. a read-only filter endpoint that uses PUT).
    const canRetryMethod = retrySafe || isRetryableMethod(method);
    if (!canRetryMethod || attempt >= MAX_SAFE_RETRIES) {
        return false;
    }

    return RETRYABLE_STATUS_CODES.has(errorCode ?? 0) || RETRYABLE_ERROR_NAMES.has(errorName ?? '');
};

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
    const method = requestConfig.method ? requestConfig.method : 'GET';

    for (let attempt = 0; ; attempt++) {
        let errorCode;
        let errorHeaders;
        let response: Response | undefined;
        const timeoutSignal = AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS);

        try {
            response = await fetch(
                url,
                {
                    method,
                    headers: {
                        ...requestConfig.headers,
                        ...{ Authorization: `Basic ${authConfig.authToken}` }
                    },
                    signal: timeoutSignal,
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
            }

            const errorFromResponse = await response.text();
            errorCode = response.status;
            errorHeaders = response.headers;

            throw new Error(errorFromResponse);
        } catch (error) {
            if (shouldRetryRequest(method, requestConfig.retrySafe, attempt, errorCode, error instanceof Error ? error.name : undefined)) {
                await delay(getRetryDelayMs(attempt));
                continue;
            }

            if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
                throw new MakeRequestErrorException(
                    `Request to ${requestConfig.url} timed out after ${DEFAULT_REQUEST_TIMEOUT_MS}ms`,
                    504,
                    errorHeaders || new Headers()
                );
            }

            throw new MakeRequestErrorException(
                (error as Error).message,
                errorCode || 500,
                errorHeaders || new Headers()
            );
        }
    }
};

class MakeRequestErrorException extends Error {
    constructor(
        message: string,
        public readonly code: number,
        public readonly headers: Headers
    ) {
        super(message);
        this.name = 'MakeRequestErrorException';
    }
}

const getHeaders = (version: VersionString, extraHeaders: HeadersInit = {}) => {
    return new Headers({
        ...extraHeaders,
        'Content-Type': 'application/xml',
        'Accept': `application/vnd.keepit.${version}+xml`
    });
};

export {
    getHeaders,
    makeRequest,
    MakeRequestErrorException,
    shouldRetryRequest
};
