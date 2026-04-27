// fast-xml-parser collapses repeated XML elements into an array but returns a plain
// object when only one element is present. This wrapper normalises both cases so
// callers always receive an array regardless of how many items the API returned.
export function normalizeArrayResponse<T> (responseNode?: T | T[]): T[] {
    if (responseNode) {
        return Array.isArray(responseNode)
            ? responseNode
            : [responseNode];
    }

    return [];
};
