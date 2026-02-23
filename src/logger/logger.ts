import { appendFileSync } from 'fs';
import { join } from 'path';

type TLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

// Use process.cwd() for compatibility with test environment
const LOG_FILE = join(process.cwd(), 'keepit-mcp-pro.log');

function formatMessage(
    level: TLogLevel,
    message: string,
    data?: unknown
): string {
    const timestamp = new Date().toISOString();
    const dataStr = data
        ? `\n${JSON.stringify(data, null, 2)}`
        : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

function print(message: string) {
    if (isMCPServer) {
        // When running as MCP server, log to stderr so Claude Desktop can see it
        console.error(message);
    } else {
        // When running standalone or in tests, log to file
        try {
            appendFileSync(LOG_FILE, message + '\n');
        } catch (error) {
            // Fallback to stderr if file write fails
            console.error(message, error);
        }
    }
};

// Check if we're running as an MCP server (connected to Claude Desktop)
/* const isMCPServer = process.env.NODE_ENV !== 'test' && (
  process.stdin.isTTY === false ||
  process.stdout.isTTY === false ||
  process.argv.includes('--mcp')
); */
const isMCPServer = false;

export const logger = {

    info(message: string, data?: unknown) {
        const logMessage = formatMessage(
            'INFO',
            message,
            data
        );

        print(logMessage);
    },

    error(message: string, error?: unknown) {
        const logMessage = formatMessage(
            'ERROR',
            message,
            error
        );

        print(logMessage);
    },

    debug(message: string, data?: unknown) {
        const logMessage = formatMessage(
            'DEBUG',
            message,
            data
        );

        // Debug messages always go to stderr for MCP compatibility
        console.error(logMessage);
    },

    warn(message: string, data?: unknown) {
        const logMessage = formatMessage(
            'WARN',
            message,
            data
        );

        print(logMessage);
    }
};
