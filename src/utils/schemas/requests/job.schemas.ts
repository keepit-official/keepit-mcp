import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';
import { ISO8601DurationSchema } from '../validations/iso8601.validation-schemas.js';

export const JobHistorySchema = z.object({
    guid: ConnectorGuidSchema,
    duration: ISO8601DurationSchema.optional()
});
