import { z } from 'zod';
import { KeepetGuidSchema } from '../../../utils/schemas/entities/keepit-guid.schemas.js';

export const PmcCustomerRequestBaseSchema = z.object({
    customer_guid: KeepetGuidSchema
});

const normalizeDateToTimestamp = (val: string, endOfDay: boolean): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return endOfDay ? `${val}T23:59:59Z` : `${val}T00:00:00Z`;
    }
    return val;
};

export const PmcTimeRangeSchema = z.object({
    from: z.preprocess(val => normalizeDateToTimestamp(val as string, false), z.iso.datetime()),
    to: z.preprocess(val => normalizeDateToTimestamp(val as string, true), z.iso.datetime())
}).refine(
    ({ from, to }) => new Date(from) < new Date(to),
    { message: '\'from\' must be earlier than \'to\'', path: ['from'] }
);

export const timeRangeFieldSchema = {
    timeRange: z.preprocess(
        val => typeof val === 'string' ? JSON.parse(val) : val,
        PmcTimeRangeSchema
    )
};
