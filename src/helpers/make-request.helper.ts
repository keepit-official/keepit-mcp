/**
 * Shared authenticated HTTP request executor.
 *
 * This module centralizes retry policy, timeout handling, header construction,
 * and response/error shaping for calls to the Keepit API.
 */
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

const buildSafeHttpErrorMessage = (statusCode: number) => {
    return `Keepit API request failed with HTTP ${statusCode}`;
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

    // Declared outside the loop so the callback can be invoked after the loop exits.
    // This ensures callback errors (e.g. parse failures) are never mistaken for
    // retryable network errors and retried unnecessarily.
    let rawData!: string;
    let rawHeaders!: Headers;

    for (let attempt = 0; ; attempt++) {
        let errorCode: number | undefined;
        let errorHeaders: Headers | undefined;
        const timeoutSignal = AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(
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
                rawData = await response.text();
                rawHeaders = response.headers;
                break;
            }

            errorCode = response.status;
            errorHeaders = response.headers;
            // Consume the body so the connection can be reused, but do not surface raw upstream
            // payloads to tool callers because they may contain tenant-specific details.
            await response.text();

            throw new Error(buildSafeHttpErrorMessage(response.status));
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
                error instanceof Error ? error.message : String(error),
                errorCode || 500,
                errorHeaders || new Headers()
            );
        }
    }

    if (requestConfig.includeHeaders && applyDataCallback) {
        return (applyDataCallback as TApplyDataCallbackFn<IHeaderResponse, T>)({
            data: rawData,
            headers: rawHeaders
        });
    }

    return applyDataCallback
        ? (applyDataCallback as TApplyDataCallbackFn<string, T>)(rawData)
        : rawData;
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
