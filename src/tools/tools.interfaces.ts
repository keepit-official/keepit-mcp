import type { Result, CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../helpers/auth-config.helper';

export type ToolHandlers = Record<string, (request: CallToolRequest, authConfig: IAuthConfig) => Promise<Result>>;

export type ToolResult<T = unknown> = {
    success: boolean;
    result: T;
    messages?: string[];
};

type ToolResultMetadata = {
    tool: string;
    success: boolean;
    messages?: string[];
};

export type ToolMetadata = ToolResultMetadata & CallToolResult['_meta'];

export type ToolParams = CallToolRequest['params'];
export type ToolArguments = CallToolRequest['params']['arguments'];
export type ToolPaginationParams = {
    offset?: number;
    limit?: number;
};
export type ToolPaginationResponse = {
    hasMorePages: boolean;
    nextOffset?: number;
    totalInResponse: number;
};
