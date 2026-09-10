import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { getToolConfig, getToolCallback } from '../helpers/mcp.helper.js';
import { toolsDefinitions, toolsRequiredAcl, pmcToolsDefinitions } from '../tools/index.js';
import { setupAuthConfig } from '../helpers/auth-config.helper.js';
import { checkIfPartnerRole } from '../helpers/user-role.helper.js';
import { getAllowedTools } from '../helpers/acl.helper.js';

// The MCP SDK converts the Zod schemas we register into JSON Schema draft-07 when
// answering tools/list (it stamps $schema: http://json-schema.org/draft-07/schema#).
// Strict JSON Schema 2020-12 validators — e.g. the Ajv instance used by the Claude
// Agent SDK / Cowork client — reject that dialect and fail before the tool result
// ever reaches the model. The SDK gives no knob to choose the dialect, so we replace
// the tools/list handler and advertise our original JSON Schema definitions directly,
// pinned to 2020-12 (which also preserves the full nested schema the Zod round-trip
// would otherwise flatten).
const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const withDialect = <T extends object>(schema: T): T & { $schema: string; } =>
    ({ $schema: JSON_SCHEMA_DIALECT, ...schema });

export class CustomMcpServer extends McpServer {
    private authConfig: Awaited<ReturnType<typeof setupAuthConfig>> | null = null;
    private isInitialized = false;
    private allowedTools: Tool[] = [];

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.authConfig = await setupAuthConfig();

            this.registerTools();
            this.advertiseToolsWith2020Schema();

            this.isInitialized = true;
            console.error('Initialized successfully');
        } catch (error) {
            console.error('Initialization failed:', error);
            throw new Error(`Failed to initialize MCP server: ${error}`);
        }
    }

    registerTools() {
        if (!this.authConfig) {
            throw new Error('Auth config is not set. Cannot register tools.');
        }

        const partnerMode = checkIfPartnerRole(this.authConfig.userRole);
        const toolsToUse = partnerMode ? pmcToolsDefinitions : toolsDefinitions;

        if (!toolsToUse.length) {
            console.error('No tools to register.');
            return;
        }

        const allowedTools = getAllowedTools(toolsToUse, toolsRequiredAcl);

        if (!allowedTools.length) {
            console.error('No allowed tools.');
            return;
        }

        this.allowedTools = allowedTools;

        for (const { name, description, inputSchema, outputSchema } of allowedTools) {
            const config = getToolConfig(description, inputSchema, outputSchema);
            const callback = getToolCallback(name, this.authConfig);
            this.registerTool(name, config, callback);
        };
    }

    // Replace the SDK's tools/list handler so advertised schemas use JSON Schema
    // 2020-12 instead of the draft-07 the SDK emits from our Zod round-trip. The
    // registered Zod schemas still drive incoming-argument validation; only what we
    // advertise changes.
    private advertiseToolsWith2020Schema() {
        if (!this.allowedTools.length) {
            return;
        }

        const tools: Tool[] = this.allowedTools.map(({ name, title, description, inputSchema, outputSchema }) => ({
            name,
            ...title ? { title } : {},
            ...description ? { description } : {},
            inputSchema: withDialect(inputSchema),
            ...outputSchema ? { outputSchema: withDialect(outputSchema) } : {}
        }));

        this.server.setRequestHandler(ListToolsRequestSchema, (): ListToolsResult => ({ tools }));
    }

    getAuthConfig() {
        return this.authConfig;
    }
};
