import type { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ICreateToolHandlerConfig, ToolArguments, ToolMetadata, ToolResult } from '../tools/tools.interfaces.js';
import { MakeRequestErrorException } from './make-request.helper.js';

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
    error: unknown | MakeRequestErrorException | Error
): CallToolResult => {
    const errorMessage = error instanceof MakeRequestErrorException || error instanceof Error
        ? error.message
        : 'Unknown error';

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

export const createToolHandler = async <ToolInput, ToolOutput extends { [x: string]: unknown; }>(
    toolConfig: ICreateToolHandlerConfig<ToolInput, ToolOutput>
) => {
    try {
        const { toolName, toolRequest, toolHandler, validationSchema, authConfig } = toolConfig;

        let toolHandlerResponse: Promise<ToolResult<ToolOutput>> | ToolResult<ToolOutput>;

        if (toolRequest) {
            const validatedArguments = parseToolArgsOrThrow(validationSchema, toolRequest.params.arguments);

            toolHandlerResponse = await toolHandler(
                authConfig,
                validatedArguments
            );
        } else {
            toolHandlerResponse = await toolHandler(
                authConfig
            );
        }
        
        const { result, ...meta } = toolHandlerResponse;

        const metadata: ToolMetadata = {
            tool: toolName,
            ...meta
        };

        return createToolResponse(
            result,
            metadata
        );
    } catch (error) {
        return createToolErrorResponse(toolConfig.toolName, error);
    }
};
