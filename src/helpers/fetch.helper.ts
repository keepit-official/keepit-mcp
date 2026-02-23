export function normalizeArrayResponse<T> (responseNode?: T | T[]): T[] {
    if (responseNode) {
        return Array.isArray(responseNode)
            ? responseNode
            : [responseNode];
    }

    return [];
};
