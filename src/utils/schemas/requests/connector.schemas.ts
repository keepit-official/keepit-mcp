import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';

const AccountScopeSchema = z.enum(['account', 'children', 'leaf', 'managed', 'all']);

export const ConnectorListRequestSchema = z.object({
    account_id: z.string().trim().min(1, 'Account id cannot be empty').optional(),
    scope: AccountScopeSchema.optional(),
    query: z.string().trim().min(1, 'Query cannot be empty').max(200, 'Query is too long').optional()
});

export const ConnectorHealthRequestSchema = z.object({
    guid: ConnectorGuidSchema.optional(),
    name: z.string().trim().min(1, 'Connector name cannot be empty').max(200, 'Connector name is too long').optional(),
    connector_name: z.string().trim().min(1, 'Connector name cannot be empty').max(200, 'Connector name is too long').optional(),
    query: z.string().trim().min(1, 'Query cannot be empty').max(200, 'Query is too long').optional(),
    account_id: z.string().trim().min(1, 'Account id cannot be empty').optional(),
    scope: AccountScopeSchema.optional()
}).refine(
    value => [value.guid, value.name, value.connector_name, value.query].filter(Boolean).length > 0,
    {
        message: 'Provide one of guid, name, connector_name, or query',
        path: ['guid']
    }
).refine(
    value => [value.guid, value.name, value.connector_name, value.query].filter(Boolean).length <= 1,
    {
        message: 'Provide only one of guid, name, connector_name, or query',
        path: ['guid']
    }
);
