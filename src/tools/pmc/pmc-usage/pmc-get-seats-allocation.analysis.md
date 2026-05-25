# Implement tool `pmc_get_seats_allocation`

## Description

**Input:** `customer_guid` (optional), `timeRange.from`, `timeRange.to`

### API Endpoints Used:

| Endpoint | Purpose |
| --- | --- |
| `PUT /users/{userId}/resources/max_usage/total` | Returns total peak seat usage summary for the requested account and date range, including `connectors-count`, `seats-count`, and `account-type` |
| `PUT /users/{userId}/resources/max_usage` | Returns peak usage per resource for the requested account and date range; used to build connector-level seat allocation rows |

### Output

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `total` | object | yes | Aggregated seat usage totals for the requested account and date range |
| `total.connectors-count` | number | yes | Total number of active connectors |
| `total.seats-count` | number | yes | Total peak seat count across all connectors |
| `total.account-type` | string | yes | Account type, for example `partner` or `customer` |
| `allocation` | array | yes | Per-connector allocation rows; empty array if no non-zero connector totals are found |
| `allocation[].connectorType` | string | yes | Connector type key such as `azuread`, `o365-admin`, `gsuite` |
| `allocation[].connector` | string \| null | yes | Human-readable connector name if mapped, otherwise `null` |
| `allocation[].max-usage` | number | yes | Peak seat usage for that connector within the requested time range |

### Notes

- If `customer_guid` is omitted, the tool queries the partner account using `authConfig.keepitGuid`.
- Large date ranges are split into smaller chunks internally, then merged by taking the maximum values across chunks.
- Only resources ending with `-seats-total` and having `maximum-usage > 0` are included in `allocation`.
