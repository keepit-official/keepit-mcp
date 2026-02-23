import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';
import { ISO8601TimestampSchema, ISO8601DurationSchema } from '../validations/iso8601.validation-schemas.js';

export const LatestSnapshotRequestSchema = z.object({
    guid: ConnectorGuidSchema
});

export const SnapshotRangeRequestSchema = z.object({
    guid: ConnectorGuidSchema,
    startTime: ISO8601TimestampSchema,
    timespan: ISO8601DurationSchema,
    reverse: z.boolean().default(false),
    count: z.number().int().min(1).max(99).default(99)
});
