/**
 * Factory for the configured MCP server instance.
 *
 * Package metadata is read from `package.json`, while initialization and tool
 * registration are delegated to `CustomMcpServer`.
 */
import { CustomMcpServer } from './custom-server.js';
import app from '../../package.json' with { type: 'json' };

export const createMCPServer = async () => {
    const server = new CustomMcpServer({
        name: app.name,
        version: app.version,
        description: app.description
    });

    await server.initialize();

    return server;
};
