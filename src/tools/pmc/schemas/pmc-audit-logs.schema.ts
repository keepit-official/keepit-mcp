import { PmcCustomerRequestBaseSchema, timeRangeFieldSchema } from './pmc-base.schemas.js';

export const PmcAuditLogHistorySchema = PmcCustomerRequestBaseSchema
    .partial()
    .extend(timeRangeFieldSchema);
