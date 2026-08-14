import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';

export const SearchSnapshotDataRequestSchema = z.object({
    device: ConnectorGuidSchema,
    pathRoot: z.string().optional(),
    searchTerms: z.string().optional(),
    snaptime: z.iso.datetime().optional(),
    count: z.number().int().min(1).max(1_000).optional(),
    categories: z.array(
        z.enum(['folder', 'video', 'image', 'audio', 'message', 'document', 'others'])
    ).optional(),
    subject: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    dateFrom: z.number().optional(),
    dateTo: z.number().optional(),
    mimeType: z.string().optional(),
    startIndex: z.number().int().min(0).optional()
});

export const ItemVersionsRequestSchema = z.object({
    device: ConnectorGuidSchema,
    snaptimeFrom: z.iso.datetime(),
    snaptimeTo: z.iso.datetime().optional(),
    pathRoot: z.string(),
    itemName: z.string(),
    count: z.number().int().min(1).max(100).optional(),
    startIndex: z.number().int().min(0).optional()
});
