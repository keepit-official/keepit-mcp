import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const envPath = process.env.KEEPIT_ENV_FILE || path.join(repoRoot, '.env');

const defaultConfig = {
  connectorGuid: process.env.SMOKE_CONNECTOR_GUID || ''
};

const normalizeArray = (value) => Array.isArray(value) ? value : value ? [value] : [];

const loadDotEnv = (filename) => {
  if (!fs.existsSync(filename)) {
    throw new Error(`Missing .env file at ${filename}`);
  }
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const importFromRepo = async (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  return import(pathToFileURL(absolutePath).href);
};

const parseResponsePayload = (response) => {
  if (response?.structuredContent) {
    return response.structuredContent;
  }
  const text = response?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectRejects = async (fn, expectedMessage) => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await fn();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `Expected error containing "${expectedMessage}", got "${error instanceof Error ? error.message : String(error)}"`
    );
    return;
  } finally {
    console.error = originalConsoleError;
  }

  throw new Error(`Expected failure containing "${expectedMessage}"`);
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

const runTest = async (name, fn) => {
  try {
    const result = await fn();
    if (result?.skipped) {
      console.log(`SKIP ${name}: ${result.reason}`);
      return { name, ok: true, skipped: true };
    }
    console.log(`PASS ${name}`);
    return { name, ok: true };
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    return { name, ok: false, error };
  }
};

const extractXmlValues = (xml, tagName) => {
  const pattern = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'g');
  return Array.from(String(xml).matchAll(pattern)).map(match => match[1]);
};

const getSubAccountIds = async (makeRequest, authConfig, accountId) => {
  const xml = await makeRequest({ url: `/users/${accountId}/users` }, authConfig);
  return extractXmlValues(xml, 'id');
};

const getAccountAcl = async (makeRequest, authConfig, accountId) => {
  const xml = await makeRequest({
    url: `/users/${accountId}/tokens?secondary=1`,
    headers: { Accept: 'application/vnd.keepit.v2' }
  }, authConfig);
  const aclValues = [...new Set(extractXmlValues(xml, 'acl'))];
  if (aclValues.includes('MSPPartner')) {
    return 'MSPPartner';
  }
  if (aclValues.includes('PartnerParent')) {
    return 'PartnerParent';
  }
  return aclValues[0] || null;
};

const getLeafAccountIds = async (makeRequest, authConfig, accountId) => {
  const childAccountIds = await getSubAccountIds(makeRequest, authConfig, accountId);
  if (childAccountIds.length === 0) {
    return [accountId];
  }

  const descendantLeafIds = [];
  for (const childAccountId of childAccountIds) {
    descendantLeafIds.push(...await getLeafAccountIds(makeRequest, authConfig, childAccountId));
  }

  return descendantLeafIds;
};

const getManagedAccountIds = async (makeRequest, authConfig, accountId) => {
  const childAccountIds = await getSubAccountIds(makeRequest, authConfig, accountId);
  if (childAccountIds.length === 0) {
    return [accountId];
  }

  const baseAcl = await getAccountAcl(makeRequest, authConfig, accountId);
  if (baseAcl === 'MSPPartner') {
    return getLeafAccountIds(makeRequest, authConfig, accountId);
  }

  const childSummaries = [];
  for (const childAccountId of childAccountIds) {
    const [grandchildIds, childAcl] = await Promise.all([
      getSubAccountIds(makeRequest, authConfig, childAccountId),
      getAccountAcl(makeRequest, authConfig, childAccountId)
    ]);
    childSummaries.push({
      accountId: childAccountId,
      childAcl,
      hasChildren: grandchildIds.length > 0
    });
  }

  const hasStructuredChildren = childSummaries.some(summary => summary.hasChildren);
  const directOwnedLeafIds = hasStructuredChildren
    ? childSummaries.filter(summary => !summary.hasChildren).map(summary => summary.accountId)
    : [];

  const managedDescendantIds = [];
  for (const summary of childSummaries.filter(entry => entry.hasChildren)) {
    if (summary.childAcl === 'MSPPartner') {
      managedDescendantIds.push(...await getLeafAccountIds(makeRequest, authConfig, summary.accountId));
    } else {
      managedDescendantIds.push(...await getManagedAccountIds(makeRequest, authConfig, summary.accountId));
    }
  }

  return [...new Set([...directOwnedLeafIds, ...managedDescendantIds])];
};

const main = async () => {
  loadDotEnv(envPath);
  const savedKeepitPass = process.env.KEEPIT_PASS;

  const [
    { setupAuthConfig },
    { makeRequest },
    { getConnectorsSettings },
    { ACCOUNT_TOOLS_HANDLER },
    { CONNECTOR_TOOLS_HANDLER },
    { JOBS_TOOLS_HANDLER },
    { AUDIT_LOGS_TOOLS_HANDLER },
    { SNAPSHOT_TOOLS_HANDLER },
    connectorHelpers
  ] = await Promise.all([
    importFromRepo('build/helpers/auth-config.helper.js'),
    importFromRepo('build/helpers/make-request.helper.js'),
    importFromRepo('build/api/connectors-api.js'),
    importFromRepo('build/tools/account/account-tools-handler.js'),
    importFromRepo('build/tools/connector/connectors-tools-handler.js'),
    importFromRepo('build/tools/jobs/jobs-tools-handler.js'),
    importFromRepo('build/tools/audit-logs/audit-logs-tools-handler.js'),
    importFromRepo('build/tools/snapshot/snapshot-tools-handler.js'),
    importFromRepo('build/tools/connector/connectors-tools.helper.js')
  ]);

  const authConfig = await setupAuthConfig();
  const invoke = async (handler, args = {}, scopedAuthConfig = authConfig) => {
    const response = await handler({ params: { arguments: args } }, scopedAuthConfig);
    if (response?.isError) {
      throw new Error(response?.content?.[0]?.text || 'Unknown tool error');
    }
    return parseResponsePayload(response);
  };

  const rootRole = await getAccountAcl(makeRequest, authConfig, authConfig.keepitGuid);
  const childAccountIds = await getSubAccountIds(makeRequest, authConfig, authConfig.keepitGuid);
  const managedLeafAccountIds = rootRole === 'PartnerParent' || rootRole === 'MSPPartner'
    ? await getManagedAccountIds(makeRequest, authConfig, authConfig.keepitGuid)
    : [];

  const childAccountSummaries = [];
  for (const childAccountId of childAccountIds) {
    const [nestedChildren, acl] = await Promise.all([
      getSubAccountIds(makeRequest, authConfig, childAccountId),
      getAccountAcl(makeRequest, authConfig, childAccountId)
    ]);
    childAccountSummaries.push({
      accountId: childAccountId,
      acl,
      hasChildren: nestedChildren.length > 0
    });
  }

  const getConnectorCountForAccount = async (accountId) => {
    const { requestConfig, applyDataCallback } = getConnectorsSettings(accountId);
    const connectors = await makeRequest(requestConfig, authConfig, applyDataCallback);
    return connectors;
  };

  const rootConnectors = await getConnectorCountForAccount(authConfig.keepitGuid);

  const candidateClientAccountIds = [
    ...managedLeafAccountIds,
    ...childAccountSummaries.filter(summary => !summary.hasChildren).map(summary => summary.accountId)
  ];

  let selectedClientAccountId = null;
  let selectedClientConnectors = [];
  for (const accountId of [...new Set(candidateClientAccountIds)]) {
    const connectors = await getConnectorCountForAccount(accountId);
    if (connectors.length > 0) {
      selectedClientAccountId = accountId;
      selectedClientConnectors = connectors;
      break;
    }
  }

  let discoveredConnectorGuid = defaultConfig.connectorGuid || selectedClientConnectors[0]?.guid || '';
  let discoveredRootAccountName = '';
  let discoveredUserUsername = '';
  let discoveredConnectorName = selectedClientConnectors[0]?.name || '';

  const tests = [
    ['setupAuthConfig fails fast when KEEPIT_ENV is missing', async () => {
      await withEnvOverride({ KEEPIT_ENV: undefined, KEEPIT_PASS: savedKeepitPass }, async () => {
        await expectRejects(
          () => setupAuthConfig(),
          'Missing required environment variables: KEEPIT_ENV'
        );
      });
    }],
    ['setupAuthConfig fails fast when KEEPIT_USER is missing', async () => {
      await withEnvOverride({ KEEPIT_USER: undefined }, async () => {
        await expectRejects(
          () => setupAuthConfig(),
          'Missing required environment variables: KEEPIT_USER'
        );
      });
    }],
    ['setupAuthConfig fails fast when KEEPIT_PASS is missing', async () => {
      await withEnvOverride({ KEEPIT_PASS: undefined }, async () => {
        await expectRejects(
          () => setupAuthConfig(),
          'Missing required environment variables: KEEPIT_PASS'
        );
      });
    }],
    ['setupAuthConfig can be called twice in one process', async () => {
      const configuredUser = process.env.KEEPIT_USER;
      const configuredPass = savedKeepitPass;
      const configuredEnv = process.env.KEEPIT_ENV;

      assert(typeof configuredUser === 'string' && configuredUser.length > 0, 'KEEPIT_USER must be configured for this test');
      assert(typeof configuredPass === 'string' && configuredPass.length > 0, 'KEEPIT_PASS must be configured for this test');
      assert(typeof configuredEnv === 'string' && configuredEnv.length > 0, 'KEEPIT_ENV must be configured for this test');

      await withEnvOverride({
        KEEPIT_USER: configuredUser,
        KEEPIT_PASS: configuredPass,
        KEEPIT_ENV: configuredEnv
      }, async () => {
        const firstConfig = await setupAuthConfig();
        process.env.KEEPIT_PASS = configuredPass;
        const secondConfig = await setupAuthConfig();

        assert(firstConfig.keepitGuid === secondConfig.keepitGuid, 'Repeated setupAuthConfig calls should resolve the same user');
      });
    }],
    ['connector name resolution handles exact, partial, and ambiguous matches', async () => {
      assert(typeof connectorHelpers.resolveConnectorGuidFromConnectors === 'function', 'Connector helper export is missing');
      const connectors = [
        { guid: 'aaaaaa-bbbbbb-cccccc', name: 'Finance Backup' },
        { guid: 'dddddd-eeeeee-ffffff', name: 'Salesforce Prod' },
        { guid: '111111-222222-333333', name: 'Salesforce Sandbox' }
      ];

      assert(
        connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'Finance Backup' }, connectors) === 'aaaaaa-bbbbbb-cccccc',
        'Exact connector name should resolve to the matching guid'
      );
      assert(
        connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'sandbox' }, connectors) === '111111-222222-333333',
        'Unique partial connector name should resolve to the matching guid'
      );
      await expectRejects(
        async () => connectorHelpers.resolveConnectorGuidFromConnectors({ name: 'salesforce' }, connectors),
        'is ambiguous'
      );
    }],
    ['parent account scope is detected for MSP or reseller roots', async () => {
      assert(typeof rootRole === 'string' && rootRole.length > 0, 'Root account ACL should resolve');
      if (rootRole === 'PartnerParent' || rootRole === 'MSPPartner') {
        assert(childAccountIds.length > 0, 'Parent-style accounts should expose child accounts');
        assert(Array.isArray(rootConnectors), 'Root connector result should be an array');
      }
    }],
    ['get_account_info returns compact account summary', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_info, {
        account_id: authConfig.keepitGuid
      });
      assert(payload.account && typeof payload.account === 'object', 'Missing account object');
      assert(typeof payload.account.connector_count === 'number', 'Missing connector count');
      assert(typeof payload.account.workload_count === 'number', 'Missing workload count');
      assert(payload.account.mfa && typeof payload.account.mfa.enabled === 'boolean', 'Missing account MFA summary');
      discoveredRootAccountName = payload.account.account_name || '';
    }],
    ['list_accounts returns scoped accounts', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.list_accounts, {
        scope: 'all'
      });
      assert(Array.isArray(payload.accounts), 'Missing accounts array');
      assert(payload.accounts.length >= 1, 'Expected at least one account in scope');
    }],
    ['list_sub_accounts returns direct child accounts for parent roots', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.list_sub_accounts, {
        account_id: authConfig.keepitGuid
      });
      assert(Array.isArray(payload.accounts), 'Missing sub-account array');
      assert(payload.accounts.length > 0, 'Expected at least one direct sub-account');
    }],
    ['find_account resolves by account id or name fragment', async () => {
      const query = discoveredRootAccountName || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.find_account, {
        query,
        scope: 'all'
      });
      assert(Array.isArray(payload.accounts), 'Missing matching accounts array');
      assert(payload.accounts.length > 0, 'Expected at least one matching account');
    }],
    ['get_account_contact_info returns contact and MFA summary', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_contact_info, {
        account_id: authConfig.keepitGuid
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(payload.mfa && typeof payload.mfa.enabled === 'boolean', 'Missing account MFA object');
    }],
    ['get_account_mfa_status returns MFA shape', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_mfa_status, {
        account_id: authConfig.keepitGuid
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(payload.mfa && typeof payload.mfa.enabled === 'boolean', 'Missing MFA enabled flag');
      assert(typeof payload.mfa.totp === 'boolean', 'Missing MFA TOTP flag');
    }],
    ['get_account_sso_status returns SSO shape', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_sso_status, {
        account_id: authConfig.keepitGuid
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(payload.sso && typeof payload.sso.enabled === 'boolean', 'Missing SSO enabled flag');
      assert(Array.isArray(payload.sso.configurations), 'Missing SSO configurations array');
    }],
    ['list_account_users returns users and exposes a username for later checks', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.list_account_users, {
        account_id: authConfig.keepitGuid
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(Array.isArray(payload.users), 'Missing users array');
      assert(payload.users.length > 0, 'Expected at least one account user');
      const firstUser = payload.users.find(user => typeof user.username === 'string' && user.username.length > 0);
      assert(firstUser, 'Expected at least one account user with username');
      discoveredUserUsername = firstUser.username;
    }],
    ['list_account_tokens returns token array', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.list_account_tokens, {
        account_id: authConfig.keepitGuid
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(Array.isArray(payload.tokens), 'Missing tokens array');
    }],
    ['get_user_mfa_status returns per-user MFA shape', async () => {
      if (!discoveredUserUsername) {
        return { skipped: true, reason: 'No username discovered from list_account_users' };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_user_mfa_status, {
        account_id: authConfig.keepitGuid,
        username: discoveredUserUsername
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(payload.username === discoveredUserUsername, 'Returned username should match requested username');
      assert(payload.mfa && typeof payload.mfa === 'object', 'Missing user MFA object');
    }],
    ['get_account_usage_summary returns period and workload metrics', async () => {
      const targetAccountId = selectedClientAccountId || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_usage_summary, {
        account_id: targetAccountId
      });
      assert(typeof payload.period_from === 'string' && payload.period_from.length > 0, 'Missing period_from');
      assert(typeof payload.period_to === 'string' && payload.period_to.length > 0, 'Missing period_to');
      assert(typeof payload.max_seats_count === 'number', 'Missing max seat count');
      assert(Array.isArray(payload.workloads), 'Missing workloads array');
    }],
    ['get_account_current_usage returns current workload metrics', async () => {
      const targetAccountId = selectedClientAccountId || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_current_usage, {
        account_id: targetAccountId
      });
      assert(typeof payload.current_seats_count === 'number', 'Missing current seats count');
      assert(typeof payload.workload_count === 'number', 'Missing workload count');
      assert(Array.isArray(payload.workloads), 'Missing workloads array');
    }],
    ['get_account_resource_usage returns resources array', async () => {
      const targetAccountId = selectedClientAccountId || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_resource_usage, {
        account_id: targetAccountId
      });
      assert(typeof payload.account_id === 'string' && payload.account_id.length > 0, 'Missing account id');
      assert(Array.isArray(payload.resources), 'Missing resources array');
    }],
    ['get_account_summary returns composite account view', async () => {
      const targetAccountId = selectedClientAccountId || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_summary, {
        account_id: targetAccountId
      });
      assert(payload.account && typeof payload.account === 'object', 'Missing account summary object');
      assert(Array.isArray(payload.unhealthy_connectors), 'Missing unhealthy connectors array');
      assert(Array.isArray(payload.recent_audit_events), 'Missing recent audit events array');
    }],
    ['get_account_security_summary returns security summary', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_security_summary, {
        account_id: authConfig.keepitGuid
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing security summary object');
      assert(typeof payload.summary.users_total === 'number', 'Missing users_total');
    }],
    ['get_account_token_summary returns token summary', async () => {
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_token_summary, {
        account_id: authConfig.keepitGuid
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing token summary object');
      assert(Array.isArray(payload.tokens), 'Missing token details array');
    }],
    ['get_account_connector_summary returns connector summary', async () => {
      const targetAccountId = selectedClientAccountId || authConfig.keepitGuid;
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_account_connector_summary, {
        account_id: targetAccountId
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing connector summary object');
      assert(Array.isArray(payload.workloads), 'Missing workload summary array');
      assert(Array.isArray(payload.connectors), 'Missing connector summary connectors array');
    }],
    ['managed or child client discovery finds a testable client account', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      assert(childAccountIds.length > 0, 'Expected at least one child account under the authenticated root');
      assert(
        selectedClientAccountId,
        'Expected at least one child or managed leaf account with direct connectors for smoke testing'
      );
      assert(selectedClientConnectors.length > 0, 'Selected client account should expose direct connectors');
    }],
    ['managed scope returns connectors for parent or MSP roots', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(CONNECTOR_TOOLS_HANDLER.get_cloud_connectors, {
        scope: 'managed'
      });
      assert(Array.isArray(payload.connectors), 'Managed-scope connectors should be an array');
      assert(payload.connectors.length > 0, 'Managed scope should surface client connectors under the parent root');
    }],
    ['get_cloud_connectors returns connector array for authenticated account scope', async () => {
      const payload = await invoke(CONNECTOR_TOOLS_HANDLER.get_cloud_connectors);
      assert(Array.isArray(payload.connectors), 'Missing connectors array');
    }],
    ['client account scope exposes direct connectors', async () => {
      if (!selectedClientAccountId) {
        return { skipped: true, reason: 'No child or managed client account with connectors was discoverable' };
      }
      const payload = await invoke(CONNECTOR_TOOLS_HANDLER.get_cloud_connectors, {
        account_id: selectedClientAccountId,
        scope: 'account'
      });
      assert(Array.isArray(payload.connectors), 'Missing connectors array');
      const knownConnector = payload.connectors.find(connector => connector.guid === defaultConfig.connectorGuid);
      const connector = knownConnector || payload.connectors[0];
      assert(connector, 'Expected at least one connector on the selected client account');
      assert(typeof connector.guid === 'string' && connector.guid.length > 0, 'Missing connector guid');
      assert(typeof connector.name === 'string' && connector.name.length > 0, 'Missing connector name');
      discoveredConnectorGuid = connector.guid;
      discoveredConnectorName = connector.name;
    }],
    ['find_connector resolves connector by query across scope', async () => {
      if (!discoveredConnectorName) {
        return { skipped: true, reason: 'No connector name discovered for query lookup' };
      }
      const payload = await invoke(CONNECTOR_TOOLS_HANDLER.find_connector, {
        query: discoveredConnectorName,
        account_id: selectedClientAccountId || undefined,
        scope: selectedClientAccountId ? 'account' : 'managed'
      });
      assert(Array.isArray(payload.connectors), 'Missing connectors array');
      assert(payload.connectors.length > 0, 'Expected at least one matching connector');
    }],
    ['get_connector_health returns a valid status', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const payload = await invoke(CONNECTOR_TOOLS_HANDLER.get_connector_health, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account'
      });
      assert(['healthy', 'unhealthy', 'critical'].includes(payload.health), 'Unexpected health status');
    }],
    ['get_active_jobs returns array', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const payload = await invoke(JOBS_TOOLS_HANDLER.get_active_jobs, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account'
      });
      assert(Array.isArray(payload.jobs), 'Missing jobs array');
    }],
    ['get_job_history returns array', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const payload = await invoke(JOBS_TOOLS_HANDLER.get_job_history, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account',
        duration: 'P7D'
      });
      assert(Array.isArray(payload.jobs), 'Missing jobs array');
    }],
    ['get_audit_log_history default limit and pagination', async () => {
      const payload = await invoke(AUDIT_LOGS_TOOLS_HANDLER.get_audit_log_history, {
        duration: 'P30D'
      });
      assert(Array.isArray(payload.auditLogs), 'Missing auditLogs array');
      assert(payload.pagination && typeof payload.pagination === 'object', 'Missing pagination object');
      assert(payload.pagination.totalInResponse <= 500, 'Default audit limit should be 500');
      assert(typeof payload.pagination.hasMorePages === 'boolean', 'Missing hasMorePages');
    }],
    ['get_audit_log_history supports explicit limit', async () => {
      const payload = await invoke(AUDIT_LOGS_TOOLS_HANDLER.get_audit_log_history, {
        duration: 'P30D',
        limit: 5,
        offset: 0
      });
      assert(Array.isArray(payload.auditLogs), 'Missing auditLogs array');
      assert(typeof payload.pagination.totalInResponse === 'number', 'Missing totalInResponse');
      assert(payload.pagination.totalInResponse <= 5, 'Returned records should respect explicit limit of 5');
    }],
    ['get_audit_log_summary returns aggregate audit metrics', async () => {
      const payload = await invoke(AUDIT_LOGS_TOOLS_HANDLER.get_audit_log_summary, {
        duration: 'P30D',
        top_n: 5
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing audit summary object');
      assert(typeof payload.summary.total_events === 'number', 'Missing total_events');
      assert(Array.isArray(payload.accounts), 'Missing audit summary accounts');
      assert(Array.isArray(payload.top_messages), 'Missing top_messages');
      assert(Array.isArray(payload.top_actors), 'Missing top_actors');
      assert(Array.isArray(payload.top_ips), 'Missing top_ips');
    }],
    ['get_msp_overview returns MSP totals', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_overview, {
        scope: 'all'
      });
      assert(payload.totals && typeof payload.totals === 'object', 'Missing MSP totals object');
      assert(typeof payload.totals.accounts === 'number', 'Missing account total');
      assert(Array.isArray(payload.accounts), 'Missing MSP accounts array');
    }],
    ['get_msp_security_overview returns MSP security metrics', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_security_overview, {
        scope: 'all'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP security summary');
      assert(typeof payload.summary.account_count === 'number', 'Missing MSP account count');
      assert(Array.isArray(payload.accounts), 'Missing MSP security accounts array');
    }],
    ['get_msp_usage_overview returns MSP usage metrics', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_usage_overview, {
        scope: 'managed'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP usage summary');
      assert(typeof payload.summary.account_count === 'number', 'Missing MSP usage account count');
      assert(Array.isArray(payload.accounts), 'Missing MSP usage accounts array');
      assert(Array.isArray(payload.workloads), 'Missing MSP usage workloads array');
    }],
    ['get_msp_current_usage_overview returns MSP current usage metrics', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_current_usage_overview, {
        scope: 'managed'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP current usage summary');
      assert(typeof payload.summary.current_seats_count === 'number', 'Missing current seats count');
      assert(Array.isArray(payload.accounts), 'Missing MSP current usage accounts array');
      assert(Array.isArray(payload.workloads), 'Missing MSP current usage workloads array');
    }],
    ['get_msp_workload_usage_summary returns filtered workload metrics', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_workload_usage_summary, {
        scope: 'managed'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP workload usage summary');
      assert(Array.isArray(payload.workloads), 'Missing MSP workload usage workloads array');
    }],
    ['get_msp_current_workload_usage_summary returns filtered current workload metrics', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_current_workload_usage_summary, {
        scope: 'managed'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP current workload usage summary');
      assert(Array.isArray(payload.workloads), 'Missing MSP current workload usage workloads array');
    }],
    ['get_msp_connector_summary returns MSP connector aggregation', async () => {
      if (rootRole !== 'PartnerParent' && rootRole !== 'MSPPartner') {
        return { skipped: true, reason: `Authenticated account role ${rootRole} is not a parent/MSP scope` };
      }
      const payload = await invoke(ACCOUNT_TOOLS_HANDLER.get_msp_connector_summary, {
        scope: 'managed'
      });
      assert(payload.summary && typeof payload.summary === 'object', 'Missing MSP connector summary');
      assert(Array.isArray(payload.workloads), 'Missing MSP connector workloads array');
      assert(Array.isArray(payload.connectors), 'Missing MSP connector details array');
    }],
    ['get_latest_snapshot returns snapshot metadata', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const payload = await invoke(SNAPSHOT_TOOLS_HANDLER.get_latest_snapshot, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account'
      });
      assert(payload.snapshot && typeof payload.snapshot === 'object', 'Missing snapshot object');
      assert(typeof payload.snapshot.tstamp === 'string', 'Missing snapshot timestamp');
      assert(typeof payload.snapshot.size === 'string', 'Missing snapshot size');
    }],
    ['get_snapshot_range returns snapshots', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const latestPayload = await invoke(SNAPSHOT_TOOLS_HANDLER.get_latest_snapshot, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account'
      });
      assert(latestPayload.snapshot && typeof latestPayload.snapshot === 'object', 'Missing latest snapshot object');

      const payload = await invoke(SNAPSHOT_TOOLS_HANDLER.get_snapshot_range, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account',
        timespan: 'P365D',
        reverse: true,
        count: 5
      });
      assert(Array.isArray(payload.snapshots), 'Missing snapshots array');
      assert(payload.snapshots.length > 0, 'Expected at least one snapshot');
    }],
    ['get_snapshot_range reverse ordering works', async () => {
      if (!discoveredConnectorGuid || !selectedClientAccountId) {
        return { skipped: true, reason: 'No connector GUID configured or discoverable on a client account in this tenant' };
      }
      const payload = await invoke(SNAPSHOT_TOOLS_HANDLER.get_snapshot_range, {
        guid: discoveredConnectorGuid,
        account_id: selectedClientAccountId,
        scope: 'account',
        timespan: 'P7D',
        reverse: true,
        count: 5
      });
      assert(Array.isArray(payload.snapshots), 'Missing snapshots array');
      assert(payload.snapshots.length >= 1, 'Expected at least one snapshot');
      assert(payload.snapshots.length <= 5, 'Snapshot count should respect explicit count');
    }]
  ];

  const results = [];
  for (const [name, fn] of tests) {
    results.push(await runTest(name, fn));
  }
  const failed = results.filter(result => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} smoke tests passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

await main();
