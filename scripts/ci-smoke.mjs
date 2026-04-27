/**
 * Deterministic smoke suite for local and CI verification.
 *
 * The script validates build output, helper behavior, manifest/tool sync,
 * proxy forwarding, and stdio server initialization without requiring live
 * tenant credentials.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');

const importFromBuild = async (relativePath) => {
  const absolutePath = path.join(repoRoot, 'build', relativePath);
  return import(pathToFileURL(absolutePath).href);
};

const expectRejects = async (fn, expectedMessage) => {
  await assert.rejects(
    fn,
    error => error instanceof Error && error.message.includes(expectedMessage),
    `Expected error containing "${expectedMessage}"`
  );
};

const withEnvOverride = async (overrides, fn) => {
  const originalValues = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    originalValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of originalValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const encodeMcpMessage = (payload) => `${JSON.stringify(payload)}\n`;

const tryReadMcpMessage = (buffer) => {
  const newlineIndex = buffer.indexOf('\n');
  if (newlineIndex === -1) {
    return null;
  }

  const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
  if (!line.trim()) {
    return {
      payload: null,
      remainder: buffer.slice(newlineIndex + 1)
    };
  }

  return {
    payload: JSON.parse(line),
    remainder: buffer.slice(newlineIndex + 1)
  };
};

const waitForHttp = async (url, timeoutMs = 10_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      return response;
    } catch {
      await wait(200);
    }
  }
  throw new Error(`Timed out waiting for HTTP service at ${url}`);
};

const main = async () => {
  const [
    { setupAuthConfig },
    connectorHelpers,
    analyticsHelpers,
    toolsModule
  ] = await Promise.all([
    importFromBuild(path.join('helpers', 'auth-config.helper.js')),
    importFromBuild(path.join('tools', 'connector', 'connectors-tools.helper.js')),
    importFromBuild(path.join('helpers', 'analytic-request.helper.js')),
    importFromBuild(path.join('tools', 'index.js'))
  ]);

  test('setupAuthConfig fails fast when KEEPIT_ENV is missing', async () => {
    await withEnvOverride({
      KEEPIT_USER: 'test-user',
      KEEPIT_PASS: 'test-pass',
      KEEPIT_ENV: undefined
    }, async () => {
      await expectRejects(
        () => setupAuthConfig(),
        'Missing required environment variables: KEEPIT_ENV'
      );
    });
  });

  test('setupAuthConfig fails fast when KEEPIT_USER is missing', async () => {
    await withEnvOverride({
      KEEPIT_USER: undefined,
      KEEPIT_PASS: 'test-pass',
      KEEPIT_ENV: 'au-sy'
    }, async () => {
      await expectRejects(
        () => setupAuthConfig(),
        'Missing required environment variables: KEEPIT_USER'
      );
    });
  });

  test('setupAuthConfig fails fast when KEEPIT_PASS is missing', async () => {
    await withEnvOverride({
      KEEPIT_USER: 'test-user',
      KEEPIT_PASS: undefined,
      KEEPIT_ENV: 'au-sy'
    }, async () => {
      await expectRejects(
        () => setupAuthConfig(),
        'Missing required environment variables: KEEPIT_PASS'
      );
    });
  });

  test('connector name resolution handles exact, partial, and ambiguous matches', async () => {
    assert.equal(typeof connectorHelpers.resolveConnectorGuidFromConnectors, 'function');

    const connectors = [
      { guid: 'aaaaaa-bbbbbb-cccccc', name: 'Finance Backup' },
      { guid: 'dddddd-eeeeee-ffffff', name: 'Salesforce Prod' },
      { guid: '111111-222222-333333', name: 'Salesforce Sandbox' }
    ];

    assert.equal(
      connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'Finance Backup' }, connectors),
      'aaaaaa-bbbbbb-cccccc'
    );

    assert.equal(
      connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'sandbox' }, connectors),
      '111111-222222-333333'
    );

    await expectRejects(
      async () => connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'salesforce' }, connectors),
      'is ambiguous'
    );
  });

  test('analytics can be disabled by environment flag', async () => {
    assert.equal(typeof analyticsHelpers.isAnalyticsDisabled, 'function');

    await withEnvOverride({
      KEEPIT_DISABLE_ANALYTICS: '1'
    }, async () => {
      assert.equal(analyticsHelpers.isAnalyticsDisabled(), true);
    });

    await withEnvOverride({
      KEEPIT_DISABLE_ANALYTICS: undefined
    }, async () => {
      assert.equal(analyticsHelpers.isAnalyticsDisabled(), false);
    });
  });

  test('analytics defaults to enabled when environment flag is unset', async () => {
    await withEnvOverride({
      KEEPIT_DISABLE_ANALYTICS: undefined
    }, async () => {
      assert.equal(analyticsHelpers.isAnalyticsDisabled(), false);
    });
  });

  test('manifest tool list stays in sync with runtime tool definitions', async () => {
    const manifestPath = path.join(repoRoot, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const normalizeTools = (tools) => [...tools].sort((left, right) => left.name.localeCompare(right.name));

    assert.deepEqual(
      normalizeTools(manifest.tools),
      normalizeTools(toolsModule.toolsDefinitions.map((tool) => ({
        name: tool.name,
        description: tool.description
      })))
    );
  });

  test('manifest telemetry setting maps packaged config to KEEPIT_DISABLE_ANALYTICS', async () => {
    const manifestPath = path.join(repoRoot, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    assert.deepEqual(
      manifest.user_config?.keepit_disable_analytics,
      {
        type: 'boolean',
        title: 'Disable telemetry',
        description: 'Disable Keepit MCP telemetry for this installed extension.',
        required: false,
        default: false
      }
    );

    assert.equal(
      manifest.server?.mcp_config?.env?.KEEPIT_DISABLE_ANALYTICS,
      '${user_config.keepit_disable_analytics}'
    );
  });

  test('dev proxy forwards a request to a persistent MCP process', async () => {
    const proxyPort = 33117;
    const proxyProcess = spawn('node', ['scripts/proxy-mcp.js'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        LOCAL_PORT: String(proxyPort),
        MCP_PROXY_COMMAND: 'node',
        MCP_PROXY_ARGS: JSON.stringify(['scripts/fake-mcp-server.mjs'])
      }
    });

    try {
      await waitForHttp(`http://127.0.0.1:${proxyPort}/`);

      const response = await fetch(`http://127.0.0.1:${proxyPort}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestName: 'smoke_tool',
          argumentsList: { sample: 'value' }
        })
      });

      assert.equal(response.ok, true);
      const json = await response.json();
      const structured = json?.result?.structuredContent;

      assert.equal(structured.initialized, true);
      assert.equal(structured.echoedTool, 'smoke_tool');
      assert.deepEqual(structured.echoedArguments, { sample: 'value' });
    } finally {
      proxyProcess.kill();
    }
  });

  test('dev proxy initializes successfully against the real MCP server', async () => {
    const proxyPort = 33118;
    const proxyProcess = spawn('node', ['scripts/proxy-mcp.js'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        LOCAL_PORT: String(proxyPort),
        MCP_PROXY_COMMAND: 'node',
        MCP_PROXY_ARGS: JSON.stringify(['build/main.js']),
        NODE_ENV: 'test',
        KEEPIT_MCP_MOCK_AUTH: '1'
      }
    });

    try {
      const startedAt = Date.now();
      let response;

      while (Date.now() - startedAt < 10_000) {
        try {
          response = await fetch(`http://127.0.0.1:${proxyPort}/health`);
          if (response.ok) {
            break;
          }
        } catch {
          // keep polling until the proxy and MCP child are ready
        }

        await wait(200);
      }

      assert.equal(response?.ok, true);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.initialized, true);

      const toolResponse = await fetch(`http://127.0.0.1:${proxyPort}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestName: 'get_connector_health',
          argumentsList: {}
        })
      });

      assert.equal(toolResponse.ok, true);
      const toolJson = await toolResponse.json();
      assert.equal(toolJson?.result?.isError, true);
      assert.match(String(toolJson?.result?.content?.[0]?.text ?? ''), /get_connector_health/i);
    } finally {
      proxyProcess.kill();
    }
  });

  test('real stdio server initializes, lists tools, and shuts down under test harness auth', async () => {
    const serverProcess = spawn('node', ['build/main.js'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        KEEPIT_MCP_MOCK_AUTH: '1'
      }
    });

    let stdoutBuffer = '';
    serverProcess.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
    });

    const waitForResponse = async (id, timeoutMs = 10_000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const parsed = tryReadMcpMessage(stdoutBuffer);
        if (parsed) {
          stdoutBuffer = parsed.remainder;
          if (parsed.payload?.id === id) {
            return parsed.payload;
          }
        } else {
          await wait(50);
        }
      }
      throw new Error(`Timed out waiting for MCP response ${id}`);
    };

    try {
      serverProcess.stdin.write(encodeMcpMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'ci-smoke',
            version: '1.0.0'
          }
        }
      }));

      const initializeResponse = await waitForResponse(1);
      assert.equal(initializeResponse.result.serverInfo.name, 'keepit-msp-mcp');

      serverProcess.stdin.write(encodeMcpMessage({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      }));

      serverProcess.stdin.write(encodeMcpMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      }));

      const toolsListResponse = await waitForResponse(2);
      assert.ok(Array.isArray(toolsListResponse.result.tools));
      assert.ok(toolsListResponse.result.tools.some((tool) => tool.name === 'get_account_info'));
    } finally {
      serverProcess.kill();
    }
  });

  for (const { name, fn } of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }

  console.log(`\n${tests.length}/${tests.length} CI smoke tests passed`);
};

await main();
