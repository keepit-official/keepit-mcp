/**
 * MCP registration glue.
 *
 * This module adapts the repository's tool definitions into the MCP SDK's
 * runtime registration format and wraps tool callbacks with analytics/error
 * handling.
 */
import { analyticRequest } from './analytic-request.helper.js';
import { logger } from '../logger/logger.js';
import { MakeRequestErrorException } from './make-request.helper.js';
import { toolsHandlers } from '../tools/index.js';
import { z } from 'zod';
import type { CallToolRequest, EnumSchema, JSONRPCErrorResponse, Tool } from '@modelcontextprotocol/sdk/types';
import type { IAuthConfig } from './auth-config.helper.js';
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

interface IJsonSchema {
    type: string;
    properties?: Record<string, {
        type: string;
        enum?: string[];
        description?: string;
        default?: unknown;
    }>;
    required?: string[];
}

async function runTool(
    toolFn: (payload: CallToolRequest, authConfig: IAuthConfig) => Promise<unknown>,
    name: string,
    authConfig: IAuthConfig,
    args?: Record<string, unknown>
) {
    try {
        const result = await toolFn({
            method: 'tools/call',
            params: {
                name,
                ...args ? { arguments: args } : {}
            }
        }, authConfig);

        return result;
    } catch (error) {
        logger.error(`Error calling MCP tool "${name}":`, error);
        throw error;
    }
};

function jsonSchemaToZodSchema(jsonSchema: IJsonSchema): Record<string, z.ZodTypeAny> {
    if (!jsonSchema.properties) return {};

    const zodSchemas: Record<string, z.ZodTypeAny> = {};

    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
        let schema: z.ZodTypeAny;

        switch (prop.type) {
            case 'string':
                if (prop.enum) {
                    schema = z.enum(prop.enum as [string, ...string[]]);
                } else {
                    schema = z.string();
                }
                break;
            case 'number':
                schema = z.number();
                break;
            case 'integer':
                schema = z.number().int();
                break;
            case 'boolean':
                schema = z.boolean();
                break;
            case 'array':
                schema = z.array(z.unknown());
                break;
            default:
                schema = z.unknown();
        }

        if (prop.description) {
            schema = schema.describe(prop.description);
        }

        if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
            schema = schema.optional();
        }
        if (prop.default !== undefined) {
            schema = schema.default(prop.default);
        }

        zodSchemas[key] = schema;
    }

    return zodSchemas;
}

function isJsonSchemaProperty(prop: unknown): prop is EnumSchema {
    if (typeof prop !== 'object' || prop === null) return false;
    const candidate = prop as Record<string, unknown>;
    return typeof candidate.type === 'string';
}

export function getToolConfig(
    description: Tool['description'],
    inputSchema: Tool['inputSchema'],
    outputSchema?: Tool['outputSchema']
): Parameters<typeof McpServer.prototype.registerTool>[1] {
    function toZodShape(schema?: Tool['inputSchema'] | Tool['outputSchema']) {
        if (!schema?.properties) return undefined;

        const properties: Record<string, EnumSchema> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (isJsonSchemaProperty(prop)) properties[key] = prop;
        }

        if (Object.keys(properties).length === 0) return undefined;

        const validated = {
            type: schema.type ?? 'object',
            properties,
            required: schema.required
        } satisfies Parameters<typeof jsonSchemaToZodSchema>[0];

        const zodShape = jsonSchemaToZodSchema(validated);
        return Object.keys(zodShape).length > 0 ? zodShape : undefined;
    }

    const input = toZodShape(inputSchema);
    const output = toZodShape(outputSchema);

    return {
        description,
        ...input ? { inputSchema: input } : {},
        ...output ? { outputSchema: output } : {}
    } as Parameters<typeof McpServer.prototype.registerTool>[1];
}

export function getToolCallback(name: string, authConfig: IAuthConfig): ToolCallback {
    return async (args: Record<string, unknown>) => {
        try {
            const result = await runTool(
                toolsHandlers[name],
                name,
                authConfig,
                args
            ) as {
                content: { type: 'text'; text: string; }[];
                metadata?: Record<string, string | boolean | number>;
                isError?: boolean;
            };

            analyticRequest({
                action: result?.isError ? 'Tool error' : 'Handle tool',
                context: name
            }, authConfig);

            return result;
        } catch (error) {
            // Avoid sending raw API error bodies (which may contain account data) to analytics.
            // For HTTP failures, use just the status code; for other errors, truncate the message.
            const context = error instanceof MakeRequestErrorException
                ? `HTTP ${error.code}`
                : ((error as Error).message ?? '').substring(0, 100);
            analyticRequest({
                action: 'Tool error',
                context
            }, authConfig);

            return {
                content: [{
                    type: 'text',
                    text: `Error executing tool "${name}": ${error instanceof MakeRequestErrorException ? `Keepit API request failed with HTTP ${error.code}` : (error as Error).message}`
                }],
                isError: true
            } as {
                content: { type: 'text'; text: string; }[];
                metadata?: Record<string, string | boolean | number>;
                isError?: boolean;
            };
        }
    };
}

export const jsonRpcErrorResponse = (
    code: number,
    message: string,
    id: string | number
): JSONRPCErrorResponse => {
    return {
        jsonrpc: '2.0',
        error: { code, message },
        id
    };
};
