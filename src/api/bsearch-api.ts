import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from '../helpers/fast-xml-parser-options.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import type { IMakeRequestBaseParams } from '../helpers/interfaces/make-request.interface.js';
import { generateFilterRelatedParams, parseBsearchMeta } from '../helpers/bsearch.helper.js';
import type { IBSearchParams, IBsearchResponseFeed, IFilteringParams } from './api-types/bsearch-api.js';

const Parser = new XMLParser(xmlParseOptions);

export const getBSearch = (userId: string, params: IBSearchParams, filteringParams?: IFilteringParams) => {
    const { filterType, AND, OR } = filteringParams || {};

    const filterParams = generateFilterRelatedParams(filterType, AND, OR);

    const bsearchParams = {
        apiVersion: '2',
        ...params,
        ...filterParams
    };

    const stringParams = Object.entries(bsearchParams).reduce((acc, [key, value]) => {
        acc += acc.length
            ? `&${key}=${value}`
            : `${key}=${value}`;

        return acc;
    }, '');

    const requestConfig: IMakeRequestBaseParams = {
        url: `/users/${userId}/bsearch?${stringParams}`,
        headers: {
            'Content-Type': 'application/xml'
        }
    };

    const applyDataCallback = (response: string) => {
        const parsedResponse: IBsearchResponseFeed = Parser.parse(response).feed;

        const { itemsPerPage, startIndex, totalResults } = parsedResponse;

        const hasMorePages = +startIndex + +itemsPerPage < +totalResults;
        const nextOffset = +hasMorePages ? +startIndex + +itemsPerPage : undefined;

        const results = {
            ...parsedResponse,
            entry: normalizeArrayResponse(parsedResponse.entry).map(item => {
                // took relative item path
                const pathWithItemName = item.id.split(params.device)[1];
                const parsedPath = path.parse(pathWithItemName);
                return {
                    ...item,
                    pathRoot: parsedPath.dir,
                    itemName: parsedPath.base,
                    meta: parseBsearchMeta(item.meta)
                };
            })
        };

        return {
            results,
            pagination: {
                hasMorePages,
                nextOffset,
                totalInResponse: results.entry.length
            }
        };
    };

    return { requestConfig, applyDataCallback };
};
