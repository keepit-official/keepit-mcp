import { XMLParser } from 'fast-xml-parser';
import type { IBsearchFeed, IBSearchParams, IBsearchResponseFeed, IItemVervionsParams } from '../../api/api-types/bsearch-api.js';
import { getBSearch } from '../../api/bsearch-api.js';
import type { IAuthConfig } from '../../helpers/auth-config.helper.js';
import { parseBsearchMeta } from '../../helpers/bsearch.helper.js';
import { normalizeArrayResponse } from '../../helpers/fetch.helper.js';
import { makeRequest } from '../../helpers/make-request.helper.js';
import { getFullyEncodedURI } from '../../helpers/url.helper.js';
import { logger } from '../../logger/logger.js';
import xmlParseOptions from '../../helpers/fast-xml-parser-options.js';
import type z from 'zod';
import type { SearchSnapshotDataRequestSchema } from '../../utils/schemas/requests/bsearch.schemas.js';

const Parser = new XMLParser(xmlParseOptions);

type TBsearchSearchParams = z.infer<typeof SearchSnapshotDataRequestSchema>;

export const fetchBsearchSearchRequest = async (authConfig: IAuthConfig, params: TBsearchSearchParams) => {
    try {
        const {
            categories,
            subject,
            from,
            to,
            dateFrom,
            dateTo,
            mimeType,
            ...restParams
        } = params;
        const requestParams: IBSearchParams = {
            ...restParams,
            // setting default values
            ...restParams.count ? {} : { count: 50 },
            ...restParams.pathRoot ? {} : { pathRoot: '/' },
            sortTerms: 'error,folder,path_hash,filename_hash',
            recursive: 1
        };

        const defaultFilters = ['!deleted', '!sys'];

        if (mimeType) {
            defaultFilters.push(`mime-type=${mimeType}`);
        }

        if (dateFrom || dateTo) {
            const dateFromFilter = dateFrom
                ? `:${dateFrom}`
                : '';
            const dateToFilter = dateTo
                ? `:${dateTo}`
                : '';
            defaultFilters.push(`range(date${dateFromFilter}${dateToFilter})`);
        }

        const {
            requestConfig,
            applyDataCallback
        } = getBSearch(
            authConfig.keepitGuid,
            requestParams,
            {
                filterType: 'filterOr',
                AND: categories
                    ? categories.map(category => {
                        const andCategoryFilter = [...defaultFilters, category];

                        if (category === 'message') {
                            if (subject) {
                                andCategoryFilter.push(`subject~${subject}`);
                            }
                            if (from) {
                                andCategoryFilter.push(`from~${from}`);
                            }
                            if (to) {
                                andCategoryFilter.push(`to~${to}`);
                            }
                        }

                        return andCategoryFilter.join(',');
                    })
                    : [defaultFilters.join(',')]
            }
        );

        const result = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const messages = result.pagination.totalInResponse
            ? [
                `Retrieved ${result.pagination.totalInResponse} items`,
                result.pagination.hasMorePages
                    ? `Use startIndex ${result.pagination.nextOffset} to fetch more results`
                    : 'No more pages available'
            ]
            : [`No items found that could match searchTerms: "${params.searchTerms}"`];

        return {
            result,
            messages,
            success: true
        };
    } catch (error) {
        logger.error(`[SEARCH_SNAPSHOT_DATA] Error searching items in snapshot with searchTerms: "${params.searchTerms}"`);
        throw error;
    }

};

const normalizeItemVersions = (parsedResponse: IBsearchResponseFeed): IBsearchFeed => {
    return {
        entry: normalizeArrayResponse(parsedResponse.entry).map(item => {
            const parsedMeta = parseBsearchMeta(item.meta);

            return {
                ...item,
                meta: {
                    size: parsedMeta.size,
                    dname: parsedMeta.dname,
                    author_name: parsedMeta.author_name,
                    editor_name: parsedMeta.editor_name,
                    time_created: parsedMeta.time_created,
                    udt: parsedMeta.udt,
                    mtimes: parsedMeta.mtimes,
                    'mime-type': parsedMeta['mime-type']
                },
                content: {
                    _url: item.content._url
                }
            };
        }),
        itemsPerPage: parsedResponse.itemsPerPage,
        startIndex: parsedResponse.startIndex,
        totalResults: parsedResponse.totalResults
    };
};

export const getItemVersions = async (
    authConfig: IAuthConfig,
    params: IItemVervionsParams
) => {
    try {
        const bsearchParams = {
            ...params,
            sortTerms: 'updated',
            fullHistory: '1',
            includeBody: '1',
            pathRoot: getFullyEncodedURI(params.pathRoot),
            itemName: getFullyEncodedURI(params.itemName)
        };

        const filterParams = {
            filterType: 'filterAnd' as const,
            AND: ['!deleted', '!sys']
        };

        const { requestConfig } = getBSearch(
            authConfig.keepitGuid,
            bsearchParams,
            filterParams
        );

        const applyDataCallback = (response: string) => {
            const parsedResponse: IBsearchResponseFeed = Parser.parse(response).feed;
    
            const { itemsPerPage, startIndex, totalResults } = parsedResponse;
    
            const hasMorePages = +startIndex + +itemsPerPage < +totalResults;
            const nextOffset = +hasMorePages ? +startIndex + +itemsPerPage : undefined;
    
            const itemVersions = normalizeItemVersions(parsedResponse);
    
            return {
                itemVersions,
                pagination: {
                    hasMorePages,
                    nextOffset,
                    totalInResponse: itemVersions.entry.length
                }
            };
        };

        const result = await makeRequest(requestConfig, authConfig, applyDataCallback);

        const messages = result.pagination.totalInResponse
            ? [
                `Retrieved ${result.pagination.totalInResponse} item versions`,
                result.pagination.hasMorePages
                    ? `Use startIndex ${result.pagination.nextOffset} to fetch more versions`
                    : 'No more versions available'
            ]
            : [
                `No item versions found for the specified time range ${params.snaptimeFrom} - ${params.snaptimeTo}`
            ];

        return {
            result,
            success: true,
            messages
        };
    } catch (error) {
        logger.error(`[ITEM_VERSIONS] Error getting item versions: ${JSON.stringify(error)}`);
        throw error;
    }
};
