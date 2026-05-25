# Implement tool `pmc_get_exceeding_seat_limit`

## Description

**Input:** `resource-group` (optional)

### API Endpoints Used:

| Endpoint | Purpose |
| --- | --- |
| `PUT /users/{partnerGuid}/expirations` | Returns partner subaccounts with seat limit violations for the requested connector types |

### Output

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `accounts` | array | yes | Empty array if no subaccounts exceed seat limits |
| `accounts[].guid` | string | yes | Unique identifier of the customer account |
| `accounts[].email` | string | yes | Email address of the account |
| `accounts[].company_name` | string | yes | Company name of the account |
| `accounts[].type` | string | no | Account type returned by the API |
| `accounts[].resources-violation` | array | yes | List of seat limit violations for the account |
| `accounts[].resources-violation[].name` | string | yes | Connector type such as `o365-admin`, `gsuite`, `azuread` |
| `accounts[].resources-violation[].resource_name` | string | yes | Internal resource name |
| `accounts[].resources-violation[].readable-name` | string | yes | Human-readable resource name |
| `accounts[].resources-violation[].limit` | number | yes | Seat limit for the resource |
| `accounts[].resources-violation[].usage` | number | yes | Current seat usage |
| `accounts[].resources-violation[].overage` | number | yes | Computed as `usage - limit` |
| `accounts[].resources-violation[].grace-expires` | string \| null | yes | ISO 8601 timestamp when the grace period expires, or `null` if invalid/missing |
| `accounts[].resources-violation[].isGraceExpired` | boolean | yes | `true` when the grace expiry date is earlier than the current time |

### Notes

- If `resource-group` is omitted, the tool queries all supported workload types.
- The tool filters out accounts that end up with zero matching violations after applying the optional connector-type filter.
- `grace-expires` is normalized to ISO 8601 when valid; otherwise it is returned as `null`.
