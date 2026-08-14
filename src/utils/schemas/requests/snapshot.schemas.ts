import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';

export const LatestSnapshotRequestSchema = z.object({
    guid: ConnectorGuidSchema
});

export const SnapshotRangeRequestSchema = z.object({
    guid: ConnectorGuidSchema,
    start: z.iso.datetime(),
    span: z.iso.duration(),
    reverse: z.boolean().optional(),
    count: z.number().int().min(1).max(99)
});
