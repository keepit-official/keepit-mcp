# Implement tool `pmc_get_audit_log_history`

## Description

**Input:** `timeRange.from`, `timeRange.to`, `customer_guid` (optional)

### API Endpoints Used:

| Endpoint | Purpose |
| --- | --- |
| `PUT /audit/filter/pretty?limit={limit}&offset={offset}` | Returns audit log records for the requested account and date range; used repeatedly to collect all pages of results |

### Output

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `account` | string | no | Present only in subaccount mode when `customer_guid` is provided |
| `auditLogs` | array | no | Present only in subaccount mode |
| `auditLogs[].account` | string | yes | Account identifier associated with the audit event |
| `auditLogs[].time` | string | yes | Event timestamp in ISO 8601 format |
| `auditLogs[].acl` | string | no | ACL identifying the audited endpoint |
| `auditLogs[].area` | string | yes | Area where the audited action occurred |
| `auditLogs[].message` | string | yes | Event message |
| `auditLogs[].token` | string | yes | Triggering token or user; sensitive values are masked before returning |
| `auditLogs[].company` | string | yes | Company associated with the event |
| `auditLogs[].device` | string | no | Device associated with the event, if present |
| `auditLogs[].allowed` | string | yes | Whether the action was allowed |
| `auditLogs[].succeeded` | string | no | Whether the action completed successfully |
| `auditLogs[].client-ip` | string | yes | Client IP address after sanitization |
| `auditLogs[].method` | string | no | HTTP or audit method used for the event |
| `auditLogs[].metadata` | array | no | List of metadata parameters |
| `auditLogs[].metadata[].parameter.key` | string | yes | Metadata parameter name |
| `auditLogs[].metadata[].parameter.value` | string | yes | Metadata parameter value |
| `subaccounts` | array | no | Present only in partner mode when `customer_guid` is omitted |
| `subaccounts[].account` | string | yes | Subaccount GUID used as the grouping key |
| `subaccounts[].auditLogs` | array | yes | Audit log records for that subaccount |

### Notes

- If `customer_guid` is provided, the request body uses that account only.
- If `customer_guid` is omitted, the request body uses the partner account and adds `recursive=true`, then groups returned records by subaccount.
- Results are fetched page by page using the `next-offset` response header until no further pages remain.
