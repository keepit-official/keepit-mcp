export function normalizeArrayResponse<T> (responseNode?: T | T[]): T[] {
    if (responseNode) {
        return Array.isArray(responseNode)
            ? responseNode
            : [responseNode];
    }

    return [];
};

export const getURLSearchParamsString = <T>(params?: T) => {
    if (!params) {
        return '';
    }
    const searchParams = new URLSearchParams(params);
    return '?' + searchParams.toString();
};
