import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');

const importFromBuild = async (relativePath) => {
  const absolutePath = path.join(repoRoot, 'build', relativePath);
  return import(pathToFileURL(absolutePath).href);
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

const withFetchMock = async (mock, fn) => {
  const originalFetch = global.fetch;
  global.fetch = mock;
  try {
    return await fn();
  } finally {
    global.fetch = originalFetch;
  }
};

const createAuditRecordXml = ({ index, token = `token-${index}`, time } = {}) => {
  const resolvedTime = time ?? new Date(Date.UTC(2026, 0, 1, 0, 0, index ?? 0)).toISOString();
  return [
    '<record>',
    '<account>acc-1</account>',
    `<token>${token}</token>`,
    '<client-ip>203.0.113.7</client-ip>',
    '<acl>AuditFilter</acl>',
    '<allowed>true</allowed>',
    '<method>put</method>',
    `<message>Updated ${index}</message>`,
    '<succeeded>true</succeeded>',
    `<time>${resolvedTime}</time>`,
    '<metadata />',
    '</record>'
  ].join('');
};

const createAuditResponse = ({ start, count, nextOffset } = {}) => {
  const records = Array.from({ length: count ?? 0 }, (_, offset) => createAuditRecordXml({ index: (start ?? 0) + offset }));
  const headers = new Headers();
  if (nextOffset !== undefined) {
    headers.set('next-offset', String(nextOffset));
  }

  return new Response(`<audit>${records.join('')}</audit>`, { status: 200, headers });
};

const buildUserXml = (id, name) => `<user><id>${id}</id><name>${name}</name><enabled>true</enabled><created>2026-01-01T00:00:00.000Z</created></user>`;

test('setupAuthConfig fails fast before any network call when required env is missing', async () => {
  const { setupAuthConfig } = await importFromBuild(path.join('helpers', 'auth-config.helper.js'));

  await withEnvOverride({
    KEEPIT_USER: 'test-user',
    KEEPIT_PASS: undefined,
    KEEPIT_ENV: 'au-sy'
  }, async () => {
    await assert.rejects(
      () => setupAuthConfig(),
      error => error instanceof Error && error.message.includes('KEEPIT_PASS')
    );
  });
});

test('setupAuthConfig fails fast before any network call when KEEPIT_ENV is invalid', async () => {
  const { setupAuthConfig } = await importFromBuild(path.join('helpers', 'auth-config.helper.js'));

  let fetchCalled = false;
  await withEnvOverride({
    KEEPIT_USER: 'test-user',
    KEEPIT_PASS: 'test-pass',
    KEEPIT_ENV: 'not-a-region'
  }, async () => {
    await withFetchMock(async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called for invalid KEEPIT_ENV');
    }, async () => {
      await assert.rejects(
        () => setupAuthConfig(),
        error => error instanceof Error && error.message.includes('Invalid KEEPIT_ENV value')
      );
    });
  });

  assert.equal(fetchCalled, false);
});

test('retry policy only retries safe transient failures', async () => {
  const { shouldRetryRequest } = await importFromBuild(path.join('helpers', 'make-request.helper.js'));

  assert.equal(shouldRetryRequest('GET', false, 0, 503, 'Error'), true);
  assert.equal(shouldRetryRequest('GET', false, 1, undefined, 'AbortError'), true);
  assert.equal(shouldRetryRequest('PUT', false, 0, 503, 'Error'), false);
  assert.equal(shouldRetryRequest('PUT', true, 0, 503, 'Error'), true);
  assert.equal(shouldRetryRequest('GET', false, 2, 503, 'Error'), false);
});

test('audit log settings preserve page-size semantics and parse next offset', async () => {
  const { getAuditLogHistorySettings } = await importFromBuild(path.join('api', 'audit-logs-api.js'));

  const { requestConfig, applyDataCallback } = getAuditLogHistorySettings(
    {
      account: 'account-guid',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z'
    },
    { limit: 25, offset: 50 }
  );

  assert.equal(requestConfig.url, '/audit/filter/pretty?limit=25&offset=50');

  const result = applyDataCallback({
    data: '<audit><record><account>acc-1</account><token>1234567890</token><client-ip>203.0.113.7</client-ip><acl>AuditFilter</acl><allowed>true</allowed><method>put</method><message>Updated</message><succeeded>true</succeeded><metadata /></record></audit>',
    headers: new Headers({ 'next-offset': '75' })
  });

  assert.equal(result.result.pagination.nextOffset, 75);
  assert.equal(result.result.pagination.hasMorePages, true);
  assert.equal(result.result.auditLogs.length, 1);
});

test('snapshot range parser drops entries without timestamps and keeps guaranteed fields', async () => {
  const { getSnapshotRange } = await importFromBuild(path.join('api', 'snapshot-api.js'));

  const { applyDataCallback } = getSnapshotRange('user-guid', 'device-guid', {
    from: '2026-01-01T00:00:00.000Z',
    till: '2026-01-02T00:00:00.000Z'
  });

  const result = applyDataCallback(
    '<history>' +
      '<backup><tstamp>2026-01-01T10:00:00Z</tstamp><type>manual</type><size>128</size><account>acc-1</account></backup>' +
      '<backup><type>scheduled</type><size>256</size><account>acc-2</account></backup>' +
    '</history>'
  );

  assert.deepEqual(result, [{
    timestamp: '2026-01-01T10:00:00Z',
    type: 'manual',
    size: '128',
    account: 'acc-1'
  }]);
});

test('audit log history supports continuation offsets without skipping unreturned records', async () => {
  const { getAuditLogHistory } = await importFromBuild(path.join('tools', 'audit-logs', 'audit-logs-tools.helper.js'));

  const authConfig = {
    keepitLogin: 'user@example.com',
    keepitEnv: 'au-sy',
    keepitGuid: 'root-account',
    sessionId: 'session-id',
    userRole: 'Admin',
    authToken: 'token',
    userAcl: { eacl: '', aclObject: {} }
  };

  let auditRequestCount = 0;

  const response = await withFetchMock(async (url) => {
    const target = new URL(url);

    if (target.pathname === '/users/acc-1') {
      return new Response('<user><id>acc-1</id><name>Account 1</name><enabled>true</enabled><created>2026-01-01T00:00:00.000Z</created></user>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/contacts/p') {
      return new Response('<contact><fullname>Primary Contact</fullname></contact>', { status: 200 });
    }

    if (target.pathname === '/audit/filter/pretty' && target.searchParams.get('offset') === '220') {
      auditRequestCount += 1;
      assert.equal(target.searchParams.get('limit'), '100');
      return createAuditResponse({ start: 220, count: 100, nextOffset: 320 });
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  }, async () => {
    return getAuditLogHistory({
      duration: 'P7D',
      account_id: 'acc-1',
      scope: 'account',
      include_actor_resolution: false,
      pagination: {
        limit: 100,
        offset: 220
      }
    }, authConfig);
  });

  assert.equal(response.result.auditLogs.length, 100);
  assert.equal(response.result.pagination.totalAvailable, 100);
  assert.equal(response.result.pagination.hasMorePages, true);
  assert.equal(response.result.pagination.nextOffset, 320);
  assert.equal(response.result.auditLogs[0].message, 'Updated 319');
  assert.equal(auditRequestCount, 1);
});

test('audit log token filtering matches raw token values even after masking', async () => {
  const { getAuditLogHistory } = await importFromBuild(path.join('tools', 'audit-logs', 'audit-logs-tools.helper.js'));

  const authConfig = {
    keepitLogin: 'user@example.com',
    keepitEnv: 'au-sy',
    keepitGuid: 'root-account',
    sessionId: 'session-id',
    userRole: 'Admin',
    authToken: 'token',
    userAcl: { eacl: '', aclObject: {} }
  };

  const response = await withFetchMock(async (url) => {
    const target = new URL(url);

    if (target.pathname === '/users/acc-1') {
      return new Response('<user><id>acc-1</id><name>Account 1</name><enabled>true</enabled><created>2026-01-01T00:00:00.000Z</created></user>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/contacts/p') {
      return new Response('<contact><fullname>Primary Contact</fullname></contact>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/tokens') {
      return new Response('<tokens><token><aname>different-user@example.com</aname><primary>true</primary></token></tokens>', { status: 200 });
    }

    if (target.pathname === '/audit/filter/pretty') {
      const xml = '<audit>' + createAuditRecordXml({
        index: 1,
        token: 'ABCDEF1234567890',
        time: '2026-01-01T00:00:00.000Z'
      }) + '</audit>';
      return new Response(xml, { status: 200 });
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  }, async () => {
    return getAuditLogHistory({
      duration: 'P7D',
      account_id: 'acc-1',
      scope: 'account',
      token_contains: '1234567890'
    }, authConfig);
  });

  assert.equal(response.result.auditLogs.length, 1);
  assert.equal(response.result.auditLogs[0].raw_token, undefined);
  assert.equal(response.result.auditLogs[0].token, 'ABCD***7890');
});

test('audit log history does not advertise continuation for multi-account queries', async () => {
  const { getAuditLogHistory } = await importFromBuild(path.join('tools', 'audit-logs', 'audit-logs-tools.helper.js'));

  const authConfig = {
    keepitLogin: 'user@example.com',
    keepitEnv: 'au-sy',
    keepitGuid: 'root-account',
    sessionId: 'session-id',
    userRole: 'Admin',
    authToken: 'token',
    userAcl: { eacl: '', aclObject: {} }
  };

  const buildUserXml = (id, name) => `<user><id>${id}</id><name>${name}</name><enabled>true</enabled><created>2026-01-01T00:00:00.000Z</created></user>`;
  const auditResponseForAccount = (accountId, offset) => {
    if (accountId === 'acc-1' && offset === '0') {
      return new Response('<audit>'
        + createAuditRecordXml({ index: 11, time: '2026-01-01T00:00:03.000Z' })
        + createAuditRecordXml({ index: 12, time: '2026-01-01T00:00:01.000Z' })
        + '</audit>', { status: 200 });
    }
    if (accountId === 'acc-1' && offset === '1') {
      return new Response('<audit>'
        + createAuditRecordXml({ index: 12, time: '2026-01-01T00:00:01.000Z' })
        + '</audit>', { status: 200 });
    }
    if (accountId === 'acc-2' && offset === '0') {
      return new Response('<audit>'
        + createAuditRecordXml({ index: 21, time: '2026-01-01T00:00:04.000Z' })
        + createAuditRecordXml({ index: 22, time: '2026-01-01T00:00:02.000Z' })
        + '</audit>', { status: 200 });
    }
    if (accountId === 'acc-2' && offset === '1') {
      return new Response('<audit>'
        + createAuditRecordXml({ index: 22, time: '2026-01-01T00:00:02.000Z' })
        + '</audit>', { status: 200 });
    }
    throw new Error(`Unexpected audit request for ${accountId} offset ${offset}`);
  };

  const fetchImpl = async (url, options = {}) => {
    const target = new URL(url);

    if (target.pathname === '/users/root-account/users') {
      return new Response('<users><user><id>acc-1</id></user><user><id>acc-2</id></user></users>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1') {
      return new Response(buildUserXml('acc-1', 'Account 1'), { status: 200 });
    }

    if (target.pathname === '/users/acc-2') {
      return new Response(buildUserXml('acc-2', 'Account 2'), { status: 200 });
    }

    if (target.pathname === '/users/acc-1/contacts/p') {
      return new Response('<contact><companyname>Account 1</companyname></contact>', { status: 200 });
    }

    if (target.pathname === '/users/acc-2/contacts/p') {
      return new Response('<contact><companyname>Account 2</companyname></contact>', { status: 200 });
    }

    if (target.pathname === '/audit/filter/pretty') {
      const body = options.body ?? '';
      const accountMatch = String(body).match(/<account>([^<]+)<\/account>/);
      return auditResponseForAccount(accountMatch?.[1], target.searchParams.get('offset'));
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  };

  const firstResponse = await withFetchMock(fetchImpl, async () => getAuditLogHistory({
    duration: 'P7D',
    account_id: 'root-account',
    scope: 'children',
    include_actor_resolution: false,
    pagination: {
      limit: 2
    }
  }, authConfig));

  assert.equal(firstResponse.result.auditLogs.length, 2);
  assert.equal(firstResponse.result.auditLogs[0].message, 'Updated 21');
  assert.equal(firstResponse.result.auditLogs[1].message, 'Updated 11');
  assert.equal(firstResponse.result.pagination.hasMorePages, false);
  assert.equal(firstResponse.result.pagination.nextOffset, undefined);
  assert.ok(firstResponse.messages.some((message) => message.includes('do not support continuation')));
});


test('account scope resolution uses aliases and exact-on-account-id behavior', async () => {
  const { getEffectiveScope } = await importFromBuild(path.join('tools', 'account', 'account-context.helper.js'));

  assert.equal(getEffectiveScope({ scope: 'clients' }), 'leaf');
  assert.equal(getEffectiveScope({ scope: 'msp' }), 'managed');
  assert.equal(getEffectiveScope({ hasAccountId: true, exactOnAccountId: true, defaultScope: 'all' }), 'account');
  assert.equal(getEffectiveScope({ hasAccountId: true, exactOnAccountId: false, defaultScope: 'all' }), 'all');
});

test('ACL filtering only registers tools allowed by the resolved permissions', async () => {
  const { getAllowedTools } = await importFromBuild(path.join('helpers', 'acl.helper.js'));

  const tools = [
    { name: 'tool_a', description: 'A', inputSchema: { type: 'object' } },
    { name: 'tool_b', description: 'B', inputSchema: { type: 'object' } }
  ];
  const requiredAcl = {
    tool_a: [{ name: 'User', options: ['get'] }],
    tool_b: [{ name: 'AuditFilter', options: ['put'] }]
  };
  const aclObject = {
    User: { get: true, options: false, delete: false, head: false, post: false, put: false },
    AuditFilter: { get: false, options: false, delete: false, head: false, post: false, put: false }
  };

  const allowedTools = getAllowedTools(tools, requiredAcl, aclObject);

  assert.deepEqual(allowedTools.map((tool) => tool.name), ['tool_a']);
});

test('analytics request is skipped when disabled and remains non-fatal on transport failure', async () => {
  const { analyticRequest } = await importFromBuild(path.join('helpers', 'analytic-request.helper.js'));

  const authConfig = {
    keepitLogin: 'user@example.com',
    keepitEnv: 'au-sy',
    keepitGuid: 'root-account',
    sessionId: 'session-id',
    userRole: 'Admin',
    authToken: 'token',
    userAcl: { eacl: '', aclObject: {} }
  };

  let fetchCalls = 0;
  await withEnvOverride({ KEEPIT_DISABLE_ANALYTICS: '1' }, async () => {
    await withFetchMock(async () => {
      fetchCalls += 1;
      throw new Error('fetch should not be called when analytics are disabled');
    }, async () => {
      await analyticRequest({ action: 'Tool error', context: 'test' }, authConfig);
    });
  });

  assert.equal(fetchCalls, 0);

  await withEnvOverride({ KEEPIT_DISABLE_ANALYTICS: undefined }, async () => {
    await withFetchMock(async () => {
      throw new Error('network failure');
    }, async () => {
      await assert.doesNotReject(() => analyticRequest({ action: 'Tool error', context: 'test' }, authConfig));
    });
  });
});

test('MSP overview aggregates connector totals across scoped accounts', async () => {
  const { getMspOverview } = await importFromBuild(path.join('tools', 'account', 'account-tools.helper.js'));

  const authConfig = {
    keepitLogin: 'user@example.com',
    keepitEnv: 'au-sy',
    keepitGuid: 'root-account',
    sessionId: 'session-id',
    userRole: 'Admin',
    authToken: 'token',
    userAcl: { eacl: '', aclObject: {} }
  };

  const fetchImpl = async (url) => {
    const target = new URL(url);

    if (target.pathname === '/users/root-account/users') {
      return new Response('<users><user><id>acc-1</id></user><user><id>acc-2</id></user></users>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1') {
      return new Response(buildUserXml('acc-1', 'Account 1'), { status: 200 });
    }

    if (target.pathname === '/users/acc-2') {
      return new Response(buildUserXml('acc-2', 'Account 2'), { status: 200 });
    }

    if (target.pathname === '/users/acc-1/contacts/p') {
      return new Response('<contact><companyname>Account 1</companyname></contact>', { status: 200 });
    }

    if (target.pathname === '/users/acc-2/contacts/p') {
      return new Response('<contact><companyname>Account 2</companyname></contact>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/tokens' || target.pathname === '/users/acc-2/tokens') {
      return new Response('<tokens><token><aname>secondary@example.com</aname><primary>false</primary></token></tokens>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/resources' || target.pathname === '/users/acc-2/resources') {
      return new Response('<resources></resources>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/devices') {
      return new Response('<devices><cloud><guid>conn-1</guid><name>Connector 1</name><type>office365</type></cloud></devices>', { status: 200 });
    }

    if (target.pathname === '/users/acc-2/devices') {
      return new Response('<devices><cloud><guid>conn-2</guid><name>Connector 2</name><type>office365</type></cloud><cloud><guid>conn-3</guid><name>Connector 3</name><type>salesforce</type></cloud></devices>', { status: 200 });
    }

    if (target.pathname === '/users/acc-1/devices/conn-1/health') {
      return new Response('<devhealth><health>healthy</health></devhealth>', { status: 200 });
    }

    if (target.pathname === '/users/acc-2/devices/conn-2/health') {
      return new Response('<devhealth><health>unhealthy</health></devhealth>', { status: 200 });
    }

    if (target.pathname === '/users/acc-2/devices/conn-3/health') {
      return new Response('<devhealth><health>healthy</health></devhealth>', { status: 200 });
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  };

  const result = await withFetchMock(fetchImpl, async () => getMspOverview(authConfig, {
    accountId: 'root-account',
    scope: 'children'
  }));

  assert.equal(result.result.totals.accounts, 2);
  assert.equal(result.result.totals.connectors, 3);
  assert.equal(result.result.totals.unhealthy_connectors, 1);
});
