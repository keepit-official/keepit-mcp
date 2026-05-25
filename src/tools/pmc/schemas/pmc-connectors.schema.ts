import z from 'zod';
import { KeepetGuidSchema } from '../../../utils/schemas/entities/keepit-guid.schemas.js';
import { PmcCustomerRequestBaseSchema } from './pmc-base.schemas.js';

export const PmcConnectorIssueSolutionSchema = PmcCustomerRequestBaseSchema.extend({
    connector_guid: KeepetGuidSchema,
    connector_type: z.string().optional()
});
