import type { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import type { ToolArguments, ToolMetadata } from '../tools/tools.interfaces';

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

export const parseToolArgsOrThrow = <T>(
    schema: z.ZodType<T>,
    input: ToolArguments,
    context = 'Invalid configuration'
): T => {
    const { data, success, error } = schema.safeParse(input);

    if (!success) {
        const message = error.issues
            .map(issue => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');

        throw new Error(`${context}: ${message}`);
    }

    return data;
};
