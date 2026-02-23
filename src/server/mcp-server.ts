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
