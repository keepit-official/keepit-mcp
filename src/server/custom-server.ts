import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getToolConfig, getToolCallback } from '../helpers/mcp.helper.js';
import { toolsDefinitions, toolsRequiredAcl } from '../tools/index.js';
import { setupAuthConfig } from '../helpers/auth-config.helper.js';
import { getAllowedTools } from '../helpers/acl.helper.js';

export class CustomMcpServer extends McpServer {
    private authConfig: Awaited<ReturnType<typeof setupAuthConfig>> | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.authConfig = await setupAuthConfig();

            this.registerTools();

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

        if (!toolsDefinitions.length) {
            console.error('No tools to register.');
            return;
        }

        const allowedTools = getAllowedTools(toolsDefinitions, toolsRequiredAcl);

        if (!allowedTools.length) {
            console.error('No allowed tools.');
            return;
        }

        for (const { name, description, inputSchema, outputSchema } of allowedTools) {
            const config = getToolConfig(description, inputSchema, outputSchema);
            const callback = getToolCallback(name, this.authConfig);
            this.registerTool(name, config, callback);
        };
    }

    getAuthConfig() {
        return this.authConfig;
    }
};
