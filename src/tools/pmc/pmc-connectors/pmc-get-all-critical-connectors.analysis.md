# Implement tool `pmc_get_all_critical_connectors`

## Description

**Input:** None

### API Endpoints Used:

| Endpoint | Purpose |
| --- | --- |
| `GET /users/{partnerGuid}/stats/children/partner/critical-devices?children-count=true&sort=%2Baccount-company` | Returns the partner-level list of connectors currently marked as critical across subaccounts |
| `GET /users/{account-guid}/devices/{device-guid}/status` | Resolves the connector status details needed to derive `failureReason` for each critical connector |

### Output

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `disclaimer` | string | yes | Always set to `⚠️ This data may not be fully real-time.` |
| `connectors` | array | yes | Empty array if no critical connectors are found |
| `connectors[].device-guid` | string | yes | Unique ID of the connector |
| `connectors[].device-name` | string | yes | Display name of the connector |
| `connectors[].device-type` | string | yes | Connector type such as `o365-admin`, `gsuite`, `sforce` |
| `connectors[].account-guid` | string | yes | GUID of the subaccount that owns the connector |
| `connectors[].account-name` | string | yes | Full name of the subaccount |
| `connectors[].account-email` | string | yes | Email address of the subaccount |
| `connectors[].account-company` | string | yes | Company name associated with the subaccount |
| `connectors[].failureReason` | string | yes | Human-readable failure reason derived from the connector status endpoint |

### Notes

- If a connector returned by the partner critical-devices endpoint no longer exists and the status call returns `404`, that connector is skipped.
- The returned list does not include a separate `connectorCount` field; the count is derived from `connectors.length`.
