/**
 * Minimal MCP-compatible stdio server used by CI smoke tests.
 *
 * It implements just enough of the initialize and tool-call flow to verify
 * that the local dev proxy can talk to a persistent MCP child process.
 */
const encodeMessage = (payload) => `${JSON.stringify(payload)}\n`;

const tryReadMessage = (buffer) => {
  const newlineIndex = buffer.indexOf('\n');
  if (newlineIndex === -1) {
    return null;
  }

  const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
  const remainder = buffer.slice(newlineIndex + 1);

  if (!line.trim()) {
    return {
      payload: null,
      remainder
    };
  }

  return {
    payload: JSON.parse(line),
    remainder
  };
};

let buffer = '';
let initialized = false;

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();

  while (true) {
    const parsed = tryReadMessage(buffer);
    if (!parsed) {
      break;
    }

    buffer = parsed.remainder;
    if (!parsed.payload) {
      continue;
    }

    if (parsed.payload.method === 'initialize') {
      process.stdout.write(encodeMessage({
        jsonrpc: '2.0',
        id: parsed.payload.id ?? null,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'fake-mcp-server',
            version: '1.0.0'
          }
        }
      }));
      continue;
    }

    if (parsed.payload.method === 'notifications/initialized') {
      initialized = true;
      continue;
    }

    const response = {
      jsonrpc: '2.0',
      id: parsed.payload.id ?? null,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              initialized,
              echoedTool: parsed.payload?.params?.name ?? null,
              echoedArguments: parsed.payload?.params?.arguments ?? null
            })
          }
        ],
        structuredContent: {
          initialized,
          echoedTool: parsed.payload?.params?.name ?? null,
          echoedArguments: parsed.payload?.params?.arguments ?? null
        }
      }
    };

    process.stdout.write(encodeMessage(response));
  }
});
