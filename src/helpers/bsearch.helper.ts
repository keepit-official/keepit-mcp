import type { IBsearchMeta, IBsearchResponseMeta } from '../api/api-types/bsearch-api.js';

export const generateFilterRelatedParams = (filterType?: string, andFilterList?: string[], orFilterList?: string[]) => {
    if (!filterType) {
        return {};
    }

    let valueToReturn = '';
    if (andFilterList?.length) {
        for (const andFilter of andFilterList) {
            valueToReturn += `${andFilter ? 'AND:' + andFilter + ';' : ''}`;
        }
    }

    if (orFilterList?.length) {
        for (const orFilter of orFilterList) {
            valueToReturn += `${orFilter ? 'OR:' + orFilter + ';' : ''}`;
        }
    }

    return {
        [filterType]: valueToReturn
    };
};

export const parseBsearchMeta = (metaEntry: IBsearchResponseMeta[]): IBsearchMeta => {
    const reducedMeta: IBsearchMeta = metaEntry.reduce((acc: { [key: string]: string; }, metaObj) => {
        acc[metaObj._key] = metaObj?.text || '';
        return acc;
    }, {});

    return reducedMeta;
};
