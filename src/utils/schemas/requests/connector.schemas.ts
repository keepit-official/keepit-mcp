import { z } from 'zod';
import { ConnectorGuidSchema, ConnectorTypeSchema } from '../entities/connector.schemas.js';

export const ConnectorHealthRequestSchema = z.object({
    guid: ConnectorGuidSchema,
    reason: z.boolean().default(true)
});

export const AggregatedConnectorHealthRequestSchema = z.object({
    type: ConnectorTypeSchema.optional(),
    reason: z.boolean().default(true)
});

export const ConnectorRsiSummaryRequestSchema = z.object({
    guid: ConnectorGuidSchema
});

export const AggregatedRsiSummaryRequestSchema = z.object({
    'device_type': ConnectorTypeSchema.optional()
}).optional();
