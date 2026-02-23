import type { ZodSchema } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import type { ToolMetadata } from '../tools/tools.interfaces';

export const createToolResponse = <T extends { [x: string]: unknown; } | undefined>(
    result: T,
    _meta?: ToolMetadata
): CallToolResult => {
    return {
        content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
        }],
        _meta,
        structuredContent: result
    };
};

export const createToolErrorResponse = (
    name: string,
    error: unknown | Error
): CallToolResult => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
        isError: true,
        content: [{
            type: 'text',
            text: `Error in ${name}: ${errorMessage}`
        }],
        _meta: {
            tool: name,
            success: false,
            error: errorMessage
        }
    };
};

export function parseToolArgsOrThrow(
    schema: ZodSchema,
    input: unknown,
    context = 'Invalid configuration'
) {
    const { data, success, error } = schema.safeParse(input);

    if (!success) {
        const message = error.errors
            .map(err => `${err.path.join('.')}: ${err.message}`)
            .join('; ');

        throw new Error(`${context}: ${message}`);
    }

    return data;
};
