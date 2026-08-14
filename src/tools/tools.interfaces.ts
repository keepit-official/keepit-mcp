import type { Result, CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IAuthConfig } from '../helpers/auth-config.helper.js';
import type { ZodSchema } from 'zod';

interface IBaseConfig {
    toolName: string;
    authConfig: IAuthConfig;
};

export interface IConfigWithParams<ToolInput, ToolOutput> extends IBaseConfig {
    toolRequest: CallToolRequest;
    toolHandler: (authConfig: IAuthConfig, params: ToolInput) => Promise<ToolResult<ToolOutput>> | ToolResult<ToolOutput>;
    validationSchema: ZodSchema<ToolInput>;
};

export interface IConfigWithoutParams<ToolOutput> extends IBaseConfig {
    toolRequest?: never;
    toolHandler: (authConfig: IAuthConfig) => Promise<ToolResult<ToolOutput>> | ToolResult<ToolOutput>;
    validationSchema?: never;
};

export type ICreateToolHandlerConfig<ToolInput, ToolOutput> = IConfigWithParams<ToolInput, ToolOutput> | IConfigWithoutParams<ToolOutput>;

export type ToolHandlers = Record<string, (request: CallToolRequest, authConfig: IAuthConfig) => Promise<Result>>;

export type ToolResult<T = unknown> = {
    success: boolean;
    result: T;
    messages?: string[];
} & CallToolResult['_meta'];

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
