/**
 * Shared script utilities.
 *
 * Used by ci-smoke.mjs, live-smoke.mjs, proxy-mcp.js, and tests/helpers.test.mjs.
 */

export const withEnvOverride = async (overrides, fn) => {
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

export const encodeMcpMessage = (payload) => `${JSON.stringify(payload)}\n`;

export const tryReadMcpMessage = (buffer) => {
  const newlineIndex = buffer.indexOf('\n');
  if (newlineIndex === -1) {
    return null;
  }

  const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
  const remainder = buffer.slice(newlineIndex + 1);

  if (!line.trim()) {
    return { payload: null, remainder };
  }

  return { payload: JSON.parse(line), remainder };
};
