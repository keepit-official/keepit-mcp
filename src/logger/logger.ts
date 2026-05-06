import { appendFileSync } from 'fs';
import { join } from 'path';

type TLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
const MAX_LOG_STRING_LENGTH = 500;
const REDACTED_KEYS = new Set([
    'access_key',
    'accesskey',
    'authorization',
    'auth',
    'authtoken',
    'api_key',
    'apikey',
    'bearer',
    'client_secret',
    'clientsecret',
    'cookie',
    'credential',
    'credentials',
    'keepit_pass',
    'keepit_password',
    'keepit_user',
    'private_key',
    'privatekey',
    'password',
    'secret',
    'session',
    'sessionid',
    'session_id',
    'set-cookie',
    'token',
    'raw_token'
]);

// Use process.cwd() for compatibility with test environment
const LOG_FILE = join(process.cwd(), 'keepit-msp-mcp.log');

// Log level hierarchy. Set LOG_LEVEL env var to control verbosity.
// Valid values: 'error' (default), 'warn', 'info', 'debug'
const LOG_LEVEL_PRIORITY = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type TConfiguredLevel = keyof typeof LOG_LEVEL_PRIORITY;

const rawLevel = (process.env.LOG_LEVEL ?? 'error').toLowerCase();
const configuredLevel: TConfiguredLevel = rawLevel in LOG_LEVEL_PRIORITY
    ? rawLevel as TConfiguredLevel
    : 'error';
const CURRENT_LOG_LEVEL = LOG_LEVEL_PRIORITY[configuredLevel];

function shouldLog(level: TConfiguredLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= CURRENT_LOG_LEVEL;
}

function sanitizeLogValue(data: unknown, depth = 0): unknown {
    if (depth > 5) {
        return '[MaxDepth]';
    }

    if (typeof data === 'string') {
        return data.length > MAX_LOG_STRING_LENGTH
            ? data.slice(0, MAX_LOG_STRING_LENGTH) + '...[truncated]'
            : data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeLogValue(item, depth + 1));
    }

    if (data && typeof data === 'object') {
        return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([key, value]) => {
            const normalizedKey = key.toLowerCase();
            if (REDACTED_KEYS.has(normalizedKey)) {
                return [key, '[REDACTED]'];
            }

            return [key, sanitizeLogValue(value, depth + 1)];
        }));
    }

    return data;
}

function formatMessage(
    level: TLogLevel,
    message: string,
    data?: unknown
): string {
    const timestamp = new Date().toISOString();
    const dataStr = data
        ? `\n${JSON.stringify(sanitizeLogValue(data), null, 2)}`
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

// Route logs to stderr when the process is acting as an MCP stdio server.
const isMCPServer = process.env.NODE_ENV !== 'test' && (
    process.stdin.isTTY === false ||
    process.stdout.isTTY === false ||
    process.argv.includes('--mcp')
);

export const logger = {

    info(message: string, data?: unknown) {
        if (!shouldLog('info')) return;
        print(formatMessage('INFO', message, data));
    },

    error(message: string, error?: unknown) {
        if (!shouldLog('error')) return;
        print(formatMessage('ERROR', message, error));
    },

    debug(message: string, data?: unknown) {
        if (!shouldLog('debug')) return;
        print(formatMessage('DEBUG', message, data));
    },

    warn(message: string, data?: unknown) {
        if (!shouldLog('warn')) return;
        print(formatMessage('WARN', message, data));
    }
};
