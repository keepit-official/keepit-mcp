import { z } from 'zod';
import { WORKLOAD_TYPES } from '../../../api/seat-limit-api.js';
import { PmcCustomerRequestBaseSchema, timeRangeFieldSchema } from './pmc-base.schemas.js';

export const PmcSeatLimitRequestSchema = z.object({
    'resource-group': z.array(z.enum(WORKLOAD_TYPES)).optional()
});

export const PmcSeatAllocationSchema = PmcCustomerRequestBaseSchema
    .partial()
    .extend(timeRangeFieldSchema);

export const PmcSeatUsageHistorySchema = PmcCustomerRequestBaseSchema.extend(timeRangeFieldSchema);
