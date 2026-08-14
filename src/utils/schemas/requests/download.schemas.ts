import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';

export const DownloadItemRequestSchema = z.object({
    url: z.string()
});

export const DownloadZipRequestSchema = z.object({
    deviceId: ConnectorGuidSchema,
    tstamp: z.iso.datetime(),
    id: z.array(z.string()).min(1)
});
