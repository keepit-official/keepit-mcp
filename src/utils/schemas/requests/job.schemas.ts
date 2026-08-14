import { z } from 'zod';
import { ConnectorGuidSchema, ConnectorTypeSchema } from '../entities/connector.schemas.js';
import type { TJobType } from '../../../api/api-types/jobs-api.js';

const jobTypeValues = [
    'backup',
    'srestore',
    'restore',
    'pstrestore',
    'zipdownload',
    'pmrestore'
] as const satisfies TJobType[];
const jobTypesSchema = z.enum(jobTypeValues);

export const JobHistorySchema = z.object({
    guid: ConnectorGuidSchema,
    duration: z.iso.duration().optional()
});

export const JobsCountSchema = z.object({
    guid: ConnectorGuidSchema,
    'job-types': z.array(jobTypesSchema).min(1),
    from: z.iso.datetime(),
    to: z.iso.datetime().optional()
});

export const AggregatedJobsCountSchema = z.object({
    'device-type': ConnectorTypeSchema.optional(),
    'job-types': z.array(jobTypesSchema).optional(),
    from: z.iso.datetime(),
    to: z.iso.datetime().optional()
});
