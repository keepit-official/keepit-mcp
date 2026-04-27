# Keepit MSP MCP Developer Guide

This guide documents the current codebase based on the implementation that ships in this repository. It is intended as a navigation aid for contributors and reviewers.

## Scope

This document covers:

- Runtime entrypoints and process flow
- Build, packaging, healthcheck, and smoke-test scripts
- Helper and API modules under `src/helpers` and `src/api`
- Tool definitions, handlers, and helper modules under `src/tools`
- Current testing and packaging behavior that is visible in code

## Runtime Flow

The stdio server path is:

1. `src/main.ts`
2. `src/transport/stdio.ts`
3. `src/server/mcp-server.ts`
4. `src/server/custom-server.ts`
5. `src/helpers/auth-config.helper.ts`
6. `src/tools/index.ts`
7. `src/helpers/mcp.helper.ts`

At startup the server:

1. Loads environment variables through `dotenv/config`
2. Resolves auth state with `setupAuthConfig`
3. Filters tools by ACL before registration
4. Registers tool schemas and callbacks with the MCP SDK
5. Serves requests over stdio transport

## Directory Map

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Minimal process entrypoint for stdio mode |
| `src/transport/` | MCP transport startup and shutdown handling |
| `src/server/` | MCP server construction and tool registration |
| `src/api/` | Endpoint-specific request builders and XML response parsers |
| `src/helpers/` | Shared runtime helpers such as auth, validation, telemetry, request execution, ACL, XML, dates, and tool glue |
| `src/logger/` | File-based logger with redaction of sensitive keys and per-level filtering |
| `src/tools/` | MCP tool definitions, handlers, and tool-specific orchestration helpers |
| `src/utils/` | Zod schemas and sanitizers used by tool/helper layers |
| `scripts/` | Build, packaging, smoke, proxy, and release utilities |
| `tests/` | Build-output unit tests |
| `public/` | Assets referenced by the package manifest and README |

## Script Reference

| Script file | Current behavior |
| --- | --- |
| `scripts/dev.js` | Starts `tsc --watch` and `nodemon scripts/proxy-mcp.js` in parallel for local development |
| `scripts/proxy-mcp.js` | Runs a localhost-only HTTP wrapper that forwards requests to a persistent MCP stdio child process |
| `scripts/healthcheck.mjs` | Imports built auth and analytics helpers, validates startup auth, and prints a compact status summary |
| `scripts/ci-smoke.mjs` | Runs deterministic smoke tests against built modules, the dev proxy, and the stdio server with mock auth |
| `scripts/live-smoke.mjs` | Runs live tenant checks against real credentials loaded from `.env`, `KEEPIT_ENV_FILE`, or already-exported `KEEPIT_*` environment variables |
| `scripts/sync-manifest-tools.mjs` | Rewrites manifest metadata and tool descriptions from `package.json` and built tool definitions |
| `scripts/generate-mcpb.js` | Clears export/build artifacts, rebuilds, syncs manifest metadata, copies export files, installs production dependencies into `export`, and packs `keepit-msp-mcp.mcpb` |
| `scripts/release-check.mjs` | Runs build, manifest sync, lint, unit tests, CI smoke tests, and MCPB packaging in sequence |
| `scripts/fake-mcp-server.mjs` | Minimal MCP-compatible stdio responder used by CI smoke tests |

## NPM Script Reference

| `package.json` script | Current behavior |
| --- | --- |
| `build` | Runs TypeScript compilation |
| `start` | Starts the local dev workflow via `scripts/dev.js` |
| `healthcheck` | Builds first, then runs `scripts/healthcheck.mjs` |
| `generate-mcpb` | Builds and packages the extension into `.mcpb` format |
| `prod` | Builds then starts the compiled stdio server |
| `sync:manifest` | Rewrites manifest metadata and tool descriptions without a full build |
| `lint` | Runs ESLint with `--fix` against `src` |
| `lint:check` | Runs ESLint without `--fix` against `src` |
| `release:check` | Runs the repo’s release readiness script |
| `test` | Delegates to `test:unit` |
| `test:unit` | Builds then runs the unit suite in `tests/**/*.test.mjs` |
| `smoke:ci` | Builds then runs deterministic smoke checks against the built codebase |
| `smoke:live` | Builds then runs real-account smoke checks |

## Helper Modules

### `src/helpers`

| File | Purpose |
| --- | --- |
| `acl.helper.ts` | Parses EACL strings and filters registered tools by required permissions |
| `analytic-request.helper.ts` | Sends optional telemetry and exposes `isAnalyticsDisabled` |
| `auth-config.helper.ts` | Resolves runtime auth state, test-harness auth, user GUID, role, and ACL |
| `connector-types.helper.ts` | Maps connector type identifiers to display labels and resource names |
| `date.helper.ts` | Parses ISO 8601 durations, converts durations to day counts, and computes relative date ranges |
| `environments.helper.ts` | Defines allowed Keepit environment identifiers |
| `fetch.helper.ts` | Normalizes singular-or-array XML parser results into arrays |
| `hash-guid.helper.ts` | Hashes GUID values for analytics identifiers |
| `make-request.helper.ts` | Executes authenticated HTTP requests, applies retry rules, and sanitizes surfaced HTTP failures |
| `mcp.helper.ts` | Converts JSON Schema to runtime Zod schemas and wraps tool callbacks for MCP registration |
| `tool.helper.ts` | Formats MCP success/error responses and shared argument parsing errors |
| `url-path.helper.ts` | Encodes dynamic URL path segments before request construction |
| `user-role.helper.ts` | Locates the token matching the authenticated login |
| `validations.helper.ts` | Validates resolved auth configuration and provides small string coercion helpers |
| `xml-helper.ts` | Generates XML request bodies and provides XML escape helpers |

### `src/helpers/interfaces`

| File | Purpose |
| --- | --- |
| `make-request.interface.ts` | Shared request and callback typings for `makeRequest` |

## API Modules

### `src/api`

| File | Purpose |
| --- | --- |
| `account-api.ts` | Builds account, MFA, SSO, token attribute, resource, and usage requests |
| `audit-logs-api.ts` | Builds audit log filter requests and applies masking/pagination parsing |
| `authentication-api.ts` | Builds token listing and token detail requests |
| `connectors-api.ts` | Builds connector listing and connector health requests |
| `fast-xml-parser-options.ts` | Shared XML parser configuration |
| `jobs-api.ts` | Builds active-job and job-history requests |
| `snapshot-api.ts` | Builds latest-snapshot and snapshot-range requests |

### `src/api/api-types`

These declaration files define the shapes expected by the helper and tool layers after XML parsing. They act as the shared type boundary between low-level API parsing and higher-level tool aggregation.

## Tool Layer

Most tool areas follow a three-file pattern:

- `*-tools-definitions.ts`: MCP tool metadata and ACL requirements
- `*-tools-handler.ts`: MCP handler wrappers that validate, call helper functions, and shape responses
- `*-tools.helper.ts`: domain logic, aggregation, scoping, and response normalization

The account tool area uses an expanded variant of this pattern — see the Account Tools table below for the full file breakdown.

### Tool Registry

| File | Purpose |
| --- | --- |
| `src/tools/index.ts` | Merges all tool definitions, handlers, and ACL maps into the runtime registry |
| `src/tools/tools.interfaces.ts` | Shared tool-layer interfaces and response metadata shapes |

### Account Tools

| File | Purpose |
| --- | --- |
| `src/tools/account/account-context.helper.ts` | Shared account-scope traversal, request caching, concurrency control, and account metadata resolution |
| `src/tools/account/account-tools-definitions.ts` | Account/MSP tool schemas and required ACL declarations |
| `src/tools/account/account-tools-handler.ts` | Account/MSP MCP handler wrappers |
| `src/tools/account/account-tools.helper.ts` | Named re-export barrel — re-exports all functions from the four focused helper files below so existing consumers are unaffected |
| `src/tools/account/account-tools-utils.ts` | Shared types (`TToolResult`, `TTokenLike`, `TAccountMfa`, `TAccountSso`, `TUserMfa`, `TResource`, `TScopedConnector`, `TMeta`) and shared utilities (`withMeta`, `coerceNumber`) used across the account helper files |
| `src/tools/account/account-tools-nav.helper.ts` | Auth bootstrap and account navigation — `getUserId`, `getUserRole`, `listAccounts`, `listSubAccounts`, `findAccount` |
| `src/tools/account/account-tools-single.helper.ts` | Single-account summaries, info, usage aggregation, token/user shaping, security, connector, MFA, and SSO functions (`getAccountInfo`, `getAccountContactInfo`, `getAccountMfaInfo`, `getAccountSsoInfo`, `getUserMfaInfo`, `listAccountUsers`, `listAccountTokens`, `getAccountUsageSummary`, `getAccountCurrentUsage`, `getAccountResourceUsage`, `getAccountSummary`, `getAccountSecuritySummary`, `getAccountTokenSummary`, `getAccountConnectorSummary`) |
| `src/tools/account/account-tools-msp.helper.ts` | MSP fan-out aggregation, workload rollups, and security overviews (`getMspOverview`, `getMspSecurityOverview`, `getMspUsageOverview`, `getMspCurrentUsageOverview`, `getMspWorkloadUsageSummary`, `getMspCurrentWorkloadUsageSummary`, `getMspConnectorSummary`) |

### Connector Tools

| File | Purpose |
| --- | --- |
| `src/tools/connector/connectors-tools-definitions.ts` | Connector tool schemas and ACL declarations |
| `src/tools/connector/connectors-tools-handler.ts` | Connector MCP handler wrappers |
| `src/tools/connector/connectors-tools.helper.ts` | Scope-aware connector discovery, connector filtering, connector resolution, and health lookup |

### Job Tools

| File | Purpose |
| --- | --- |
| `src/tools/jobs/jobs-tools-definitions.ts` | Job tool schemas and ACL declarations |
| `src/tools/jobs/jobs-tools-handler.ts` | Job MCP handler wrappers |
| `src/tools/jobs/jobs-tools.helper.ts` | Job argument validation, active job lookup, and chunked history retrieval |

### Audit Log Tools

| File | Purpose |
| --- | --- |
| `src/tools/audit-logs/audit-logs-tools-definitions.ts` | Audit tool schemas and ACL declarations |
| `src/tools/audit-logs/audit-logs-tools-handler.ts` | Audit MCP handler wrappers |
| `src/tools/audit-logs/audit-logs-tools.helper.ts` | Audit scope resolution, filter application, pagination handling, actor resolution, and summary aggregation |

### Snapshot Tools

| File | Purpose |
| --- | --- |
| `src/tools/snapshot/snapshot-tools-definitions.ts` | Snapshot tool schemas and ACL declarations |
| `src/tools/snapshot/snapshot-tools-handler.ts` | Snapshot MCP handler wrappers |
| `src/tools/snapshot/snapshot-tools.helper.ts` | Snapshot argument validation, connector resolution, latest snapshot lookup, and range retrieval |

## Validation and Sanitization

| File | Purpose |
| --- | --- |
| `src/utils/sanitizers/account-id.sanitizer.ts` | Validates account IDs against the shared account schema |
| `src/utils/sanitizers/connector-id.sanitizer.ts` | Validates and normalizes connector GUIDs |
| `src/utils/sanitizers/ip-address.sanitizer.ts` | Validates or normalizes IP values before returning them in audit logs |
| `src/utils/schemas/entities/account.schemas.ts` | Shared `account_id` schema |
| `src/utils/schemas/entities/connector.schemas.ts` | Shared connector GUID schema |
| `src/utils/schemas/requests/audit-log.schemas.ts` | Audit request schemas and fetch/page-size limits |
| `src/utils/schemas/requests/connector.schemas.ts` | Connector request schemas |
| `src/utils/schemas/requests/job.schemas.ts` | Job request schemas and 90-day history guardrails |
| `src/utils/schemas/requests/snapshot.schemas.ts` | Snapshot request schemas |
| `src/utils/schemas/validations/iso8601.validation-schemas.ts` | Reusable ISO 8601 string schemas |

## Testing

| File | Purpose |
| --- | --- |
| `tests/helpers.test.mjs` | Unit coverage for auth validation, HTTP error exception types, retry policy, scope input validation, date argument validation, audit pagination/filtering, analytics opt-out behavior, account scope handling, ACL filtering, and MSP aggregation |
| `scripts/ci-smoke.mjs` | Black-box and process-level smoke coverage for the proxy, stdio server, manifest/tool sync, and selected helper behavior |
| `scripts/live-smoke.mjs` | Real account coverage for the main tool surfaces using build output |

## Recommended Verification Path

For the broadest local pre-release verification that is currently implemented in this repository, run:

```bash
npm run release:check
```

The current script executes:

1. `npm run build`
2. `npm run sync:manifest`
3. `npm run lint:check`
4. `npm run test:unit`
5. `npm run smoke:ci`
6. `npm run generate-mcpb`

## Packaging

The current packaging flow is:

1. Remove `build`, `export`, and previous `.mcpb` output
2. Compile TypeScript
3. Sync manifest metadata and tool descriptions
4. Copy build output and selected static files into `export/`
5. Install production dependencies into `export/`
6. Pack `export/` into `keepit-msp-mcp.mcpb`

`scripts/generate-mcpb.js` performs the full flow, and `scripts/sync-manifest-tools.mjs` is the manifest update step used by both packaging and release verification.

## Documentation Maintenance Rules

If you extend this repository, prefer these update rules:

- Update `manifest.json` and `scripts/sync-manifest-tools.mjs` together when packaging metadata changes
- Update this guide when you add a new script, helper category, API module, or tool area
- Update `README.md` when user-facing behavior changes
- Keep comments factual and implementation-backed; avoid documenting behavior that is not enforced by code
