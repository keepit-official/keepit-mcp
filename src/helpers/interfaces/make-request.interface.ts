export type TRequestMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'HEAD';

export interface IMakeRequestBaseParams {
    url: string;
    method?: TRequestMethod;
    authToken?: string;
    headers?: HeadersInit;
    body?: string | BodyInit;
    retrySafe?: boolean;
    // `never` on the base type makes this a discriminated union: callers that set
    // includeHeaders to any real value get a compile error unless they use
    // IMakeRequestHeaderParams, which overrides this field with `true`.
    includeHeaders?: never;
}

export interface IMakeRequestHeaderParams extends Omit<IMakeRequestBaseParams, 'includeHeaders'> {
    includeHeaders: true;
}

export interface IHeaderResponse {
    data: string;
    headers: Headers;
}

export type TApplyDataCallbackFn<T, R> = (response: T) => R;

export type VersionString = `v${number}`;
