import type { ToolHandlers } from './tools.interfaces.js';

import { ACCOUNT_TOOLS_DEFINITIONS, ACCOUNT_TOOLS_REQUIRED_ACL } from './account/account-tools-definitions.js';
import { JOBS_TOOLS_DEFINITIONS, JOBS_TOOLS_REQUIRED_ACL } from './jobs/jobs-tools-definitions.js';
import { AUDIT_LOG_TOOLS_DEFINITIONS, AUDIT_LOG_TOOLS_REQUIRED_ACL } from './audit-logs/audit-logs-tools-definitions.js';
import { SNAPSHOT_TOOLS_DEFINITIONS, SNAPSHOT_TOOLS_REQUIRED_ACL } from './snapshot/snapshot-tools-definitions.js';
import { CONNECTOR_TOOLS_DEFINITIONS, CONNECTORS_TOOLS_REQUIRED_ACL } from './connector/connectors-tools-definitions.js';
import { PMC_CONNECTORS_TOOLS_DEFINITIONS, PMC_CONNECTORS_TOOLS_REQUIRED_ACL } from './pmc/pmc-connectors/pmc-connectors-tools-definitions.js';
import { PMC_ACCOUNTS_TOOLS_DEFINITIONS, PMC_ACCOUNTS_TOOLS_REQUIRED_ACL } from './pmc/pmc-accounts/pmc-accounts-tools-definitions.js';
import { PMC_USAGE_TOOLS_DEFINITIONS, PMC_USAGE_TOOLS_REQUIRED_ACL } from './pmc/pmc-usage/pmc-usage-tools-definitions.js';
import { PMC_AUDIT_LOGS_TOOLS_DEFINITIONS, PMC_AUDIT_LOGS_TOOLS_REQUIRED_ACL } from './pmc/pmc-audit-logs/pmc-audit-logs-tools-definitions.js';

import { ACCOUNT_TOOLS_HANDLER } from './account/account-tools-handler.js';
import { JOBS_TOOLS_HANDLER } from './jobs/jobs-tools-handler.js';
import { CONNECTOR_TOOLS_HANDLER } from './connector/connectors-tools-handler.js';
import { AUDIT_LOGS_TOOLS_HANDLER } from './audit-logs/audit-logs-tools-handler.js';
import { SNAPSHOT_TOOLS_HANDLER } from './snapshot/snapshot-tools-handler.js';
import { PMC_CONNECTORS_TOOLS_HANDLER } from './pmc/pmc-connectors/pmc-connectors-tools-handler.js';
import { PMC_ACCOUNTS_TOOLS_HANDLER } from './pmc/pmc-accounts/pmc-accounts-tools-handler.js';
import { PMC_USAGE_TOOLS_HANDLER } from './pmc/pmc-usage/pmc-usage-tools-handler.js';
import { PMC_AUDIT_LOGS_TOOLS_HANDLER } from './pmc/pmc-audit-logs/pmc-audit-logs-tools-handler.js';

export const toolsDefinitions = [
    ...ACCOUNT_TOOLS_DEFINITIONS,
    ...JOBS_TOOLS_DEFINITIONS,
    ...CONNECTOR_TOOLS_DEFINITIONS,
    ...AUDIT_LOG_TOOLS_DEFINITIONS,
    ...SNAPSHOT_TOOLS_DEFINITIONS
];

export const toolsHandlers: ToolHandlers = {
    ...CONNECTOR_TOOLS_HANDLER,
    ...JOBS_TOOLS_HANDLER,
    ...ACCOUNT_TOOLS_HANDLER,
    ...AUDIT_LOGS_TOOLS_HANDLER,
    ...SNAPSHOT_TOOLS_HANDLER,
    ...PMC_CONNECTORS_TOOLS_HANDLER,
    ...PMC_ACCOUNTS_TOOLS_HANDLER,
    ...PMC_USAGE_TOOLS_HANDLER,
    ...PMC_AUDIT_LOGS_TOOLS_HANDLER
};

export const toolsRequiredAcl = {
    ...ACCOUNT_TOOLS_REQUIRED_ACL,
    ...JOBS_TOOLS_REQUIRED_ACL,
    ...CONNECTORS_TOOLS_REQUIRED_ACL,
    ...AUDIT_LOG_TOOLS_REQUIRED_ACL,
    ...SNAPSHOT_TOOLS_REQUIRED_ACL,
    ...PMC_CONNECTORS_TOOLS_REQUIRED_ACL,
    ...PMC_ACCOUNTS_TOOLS_REQUIRED_ACL,
    ...PMC_USAGE_TOOLS_REQUIRED_ACL,
    ...PMC_AUDIT_LOGS_TOOLS_REQUIRED_ACL
};

export const pmcToolsDefinitions = [
    ...PMC_CONNECTORS_TOOLS_DEFINITIONS,
    ...PMC_ACCOUNTS_TOOLS_DEFINITIONS,
    ...PMC_USAGE_TOOLS_DEFINITIONS,
    ...PMC_AUDIT_LOGS_TOOLS_DEFINITIONS
];
