import { parseToolArgsOrThrow } from '../../../helpers/tool.helper.js';
import type { ToolParams } from '../../tools.interfaces.js';
import type { z } from 'zod';

export const getValidatedPmcToolArguments = <T>(
    toolParams: ToolParams,
    schema: z.ZodType<T>
): T => {
    return parseToolArgsOrThrow(schema, toolParams.arguments);
};
