export interface IBSearchParams {
    device: string;
    snaptimeFrom?: string;
    snaptimeTo?: string;
    snaptime?: string;
    pathRoot?: string;
    itemName?: string;
    count?: number;
    categories?: ('folder' | 'video' | 'images' | 'audio' | 'message' | 'document' | 'others')[];
    startIndex?: number;
    resolveIds?: number;
    recursive?: number;
    searchTerms?: string;
    sortTerms?: string;
};

interface IItemVervionsParams extends IBSearchParams {
    pathRoot: string;
    itemName: string;
}

export interface IFilteringParams {
    filterType: 'filterAnd' | 'filterOr';
    AND: string[];
    OR?: string[];
}

export interface ItemVersionsToolResponse extends Record<string, unknown> {
    itemVersions: IBsearchFeed;
    pagination: ToolPaginationResponse;
}

export interface IBsearchResponseMeta {
    _key: string;
    text?: string;
};

export interface IBsearchResponseItem {
    id: string;
    name: string;
    title: string;
    dname?: string;
    category: string;
    meta: IBsearchResponseMeta[];
    updated: string;
    content: {
        _type?: string;
        _url: string;
        _medium?: string;
        _fileSize?: string;
        _error?: string;
    };
}

export interface IBsearchResponseFeed {
    entry?: IBsearchResponseItem | IBsearchResponseItem[];
    itemsPerPage: string;
    startIndex: string;
    totalResults: string;
    metakeys?: {
        key: string | string[];
    };
}

export interface IBsearchMeta {
    dname?: string;
    author_name?: string;
    editor_name?: string;
    time_created?: string;
    udt?: string;
    mtimes?: string;
    'mime-type'?: string;
    size?: string;
};

export type IBsearchItem = Omit<IBsearchResponseItem, 'meta' | 'content'> & {
    meta: IBsearchMeta;
    content: {
        _url: string;
    };
};

export type IBsearchFeed = Omit<IBsearchResponseFeed, 'entry' | 'metakeys'> & {
    entry: IBsearchItem[];
};
