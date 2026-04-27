/**
 * Concrete MCP server wrapper for Keepit.
 *
 * This class resolves auth once, filters tools by ACL, registers only the
 * allowed tool set, and keeps initialization idempotent for test and runtime
 * callers.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../logger/logger.js';
import { getToolConfig, getToolCallback } from '../helpers/mcp.helper.js';
import { toolsDefinitions, toolsRequiredAcl } from '../tools/index.js';
import { setupAuthConfig } from '../helpers/auth-config.helper.js';
import { getAllowedTools } from '../helpers/acl.helper.js';

export class CustomMcpServer extends McpServer {
    private authConfig: Awaited<ReturnType<typeof setupAuthConfig>> | null = null;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                this.authConfig = await setupAuthConfig();
                this.registerTools();
                this.isInitialized = true;
                logger.info('Initialized successfully');
            } catch (error) {
                logger.error('Initialization failed:', error);
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to initialize MCP server: ${message}`);
            }
        })();

        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    registerTools() {
        if (!this.authConfig) {
            throw new Error('Auth config is not set. Cannot register tools.');
        }

        if (!toolsDefinitions.length) {
            throw new Error('No tools are defined for registration.');
        }

        const allowedTools = getAllowedTools(
            toolsDefinitions,
            toolsRequiredAcl,
            this.authConfig.userAcl.aclObject
        );

        if (!allowedTools.length) {
            throw new Error('No allowed tools were resolved from the current ACL.');
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
