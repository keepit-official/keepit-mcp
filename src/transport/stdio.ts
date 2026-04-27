/**
 * Stdio transport bootstrapper.
 *
 * This module creates the MCP stdio transport, connects the initialized
 * server, and performs process-level shutdown handling for SIGINT/SIGTERM.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../server/mcp-server.js';

export const runMcpServerOverStdio = async () => {
    const transport = new StdioServerTransport();
    const server = await createMCPServer();

    const shutdown = async () => {
        try {
            console.error('Shutting down...');
            await server.close();
            await transport.close();
            console.error('Shutdown completed');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    };

    try {
        await server.connect(transport);
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        console.error('Server started over stdio');
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
};
