/**
 * DEV TOOL ONLY — NOT FOR PRODUCTION USE
 *
 * This proxy keeps a single MCP stdio server process alive and forwards HTTP
 * requests to it using the same newline-delimited JSON transport and
 * initialize/initialized handshake used by the real MCP stdio server.
 * It is bound to 127.0.0.1 to prevent network exposure and is intended only
 * for local development/testing.
 */
import express from 'express';
import { spawn } from 'child_process';
import 'dotenv/config.js';
import { encodeMcpMessage, tryReadMcpMessage } from './utils.mjs';

const app = express();
const PORT = process.env.LOCAL_PORT || 3000;
const MCP_REQUEST_TIMEOUT_MS = 30_000;
const MCP_PROXY_COMMAND = process.env.MCP_PROXY_COMMAND || 'node';

const parseProxyArgs = () => {
  if (!process.env.MCP_PROXY_ARGS) {
    return ['./build/main.js'];
  }

  try {
    const parsed = JSON.parse(process.env.MCP_PROXY_ARGS);
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
      throw new Error('MCP_PROXY_ARGS must be a JSON array of strings');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid MCP_PROXY_ARGS: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const MCP_PROXY_ARGS = parseProxyArgs();

app.use(express.json());

let requestIdCounter = 1;
let serverProcess = null;
let stdoutBuffer = '';
let initialized = false;
let initializationPromise = null;
const pendingRequests = new Map();

const rejectAllPending = (error) => {
  for (const pending of pendingRequests.values()) {
    clearTimeout(pending.timeoutHandle);
    pending.reject(error);
  }
  pendingRequests.clear();
};

const writeToServer = (processHandle, payload) => {
  processHandle.stdin.write(encodeMcpMessage(payload));
};

const sendMcpMessage = async (payload, options = {}) => {
  const processHandle = startServer();
  const id = payload.id ?? requestIdCounter++;
  const message = { ...payload, id };
  const { skipInitialization = false } = options;

  if (!skipInitialization) {
    await ensureInitialized();
  }

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Timed out waiting for MCP response after ${MCP_REQUEST_TIMEOUT_MS}ms`));
    }, MCP_REQUEST_TIMEOUT_MS);

    pendingRequests.set(id, { resolve, reject, timeoutHandle });

    try {
      writeToServer(processHandle, message);
    } catch (error) {
      clearTimeout(timeoutHandle);
      pendingRequests.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

const sendMcpNotification = (payload) => {
  const processHandle = startServer();
  writeToServer(processHandle, payload);
};

const ensureInitialized = async () => {
  if (initialized) {
    return;
  }

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    const response = await sendMcpMessage({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'keepit-msp-proxy',
          version: '1.0.0'
        }
      }
    }, { skipInitialization: true });

    if (response?.error) {
      throw new Error(response.error.message || 'MCP initialize failed');
    }

    sendMcpNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    });

    initialized = true;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
};

const startServer = () => {
  if (serverProcess && !serverProcess.killed) {
    return serverProcess;
  }

  stdoutBuffer = '';
  initialized = false;
  initializationPromise = null;

  serverProcess = spawn(MCP_PROXY_COMMAND, MCP_PROXY_ARGS, {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  serverProcess.stdout.on('data', (data) => {
    try {
      stdoutBuffer += data.toString();
      while (true) {
        const parsedMessage = tryReadMcpMessage(stdoutBuffer);
        if (!parsedMessage) {
          break;
        }

        stdoutBuffer = parsedMessage.remainder;
        if (!parsedMessage.payload) {
          continue;
        }

        const responseId = parsedMessage.payload.id;
        if (responseId === undefined || responseId === null) {
          continue;
        }

        const pending = pendingRequests.get(responseId);
        if (!pending) {
          continue;
        }

        clearTimeout(pending.timeoutHandle);
        pendingRequests.delete(responseId);
        pending.resolve(parsedMessage.payload);
      }
    } catch (error) {
      rejectAllPending(error instanceof Error ? error : new Error(String(error)));
    }
  });

  serverProcess.on('error', (error) => {
    rejectAllPending(error);
  });

  serverProcess.on('exit', (code, signal) => {
    const exitError = new Error(`MCP server exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    rejectAllPending(exitError);
    serverProcess = null;
    initialized = false;
    initializationPromise = null;
  });

  return serverProcess;
};

app.post('/', async (req, res) => {
  const requestBody = req.body;

  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: requestBody?.requestName,
      ...(requestBody?.argumentsList && { arguments: requestBody.argumentsList })
    }
  };

  try {
    const response = await sendMcpMessage(request);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Execution error' });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await ensureInitialized();
    res.json({
      ok: true,
      initialized: true
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      initialized: false,
      error: error instanceof Error ? error.message : 'Initialization error'
    });
  }
});

const shutdown = () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`MCP Proxy API listening at http://127.0.0.1:${PORT}`);
});
