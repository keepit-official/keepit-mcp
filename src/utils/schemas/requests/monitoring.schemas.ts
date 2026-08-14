import z from 'zod';
import { ConnectorGuidSchema, ConnectorTypeSchema } from '../entities/connector.schemas.js';

export const SnapshotCoverageHistoryRequestSchema = z.object({
    guid: ConnectorGuidSchema,
    from: z.string().optional(),
    to: z.string().optional(),
    samples: z.number().optional(),
    left_margin: z.number().default(0),
    right_margin: z.number().default(0),
    raw: z.boolean().default(false),
    force_margins: z.boolean().default(false)
});

export const AggregatedSnapshotCoverageHistoryRequestSchema = z.object({
    type: ConnectorTypeSchema,
    from: z.string().optional(),
    to: z.string().optional(),
    samples: z.number().optional(),
    left_margin: z.number().default(0),
    right_margin: z.number().default(0),
    raw: z.boolean().default(true),
    force_margins: z.boolean().default(false)
});

export const MonitoringBackupSummaryRequestSchema = z.object({
    guid: ConnectorGuidSchema,
    raw: z.boolean().default(true)
});

export const MonitoringAggregatedBackupSummaryRequestSchema = z.object({
    type: ConnectorTypeSchema.optional(),
    raw: z.boolean().default(true)
});
