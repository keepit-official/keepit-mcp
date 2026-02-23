import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';

export const ConnectorHealthRequestSchema = z.object({
    guid: ConnectorGuidSchema
});
