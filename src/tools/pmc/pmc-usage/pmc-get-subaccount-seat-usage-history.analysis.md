# Implement tool `pmc_get_subaccount_seat_usage_history`

## Description

**Input:** `customer_guid`, `timeRange.from`, `timeRange.to`

### API Endpoints Used:

| Endpoint | Purpose |
| --- | --- |
| `PUT /users/{customerGuid}/resources/history` | Returns historical seat usage snapshots for the requested subaccount and date range, including aggregated resource breakdowns |

### Output

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `snapshots` | array | yes | Ordered list of usage snapshots in the requested time range; empty array if no snapshots are returned |
| `snapshots[].time` | string | yes | Snapshot timestamp in ISO 8601 format |
| `snapshots[].resources` | array | yes | Resource usage entries for that snapshot |
| `snapshots[].resources[].name` | string | yes | Internal resource name such as `m365-quadseats-full` |
| `snapshots[].resources[].readableName` | string | yes | Human-readable resource name mapped from the internal resource name |
| `snapshots[].resources[].usage` | number | yes | Seat usage count at that snapshot |
| `snapshots[].resources[].seatType` | string | no | Derived from the resource name suffix when it matches `full`, `light`, `faculty`, or `student` |
| `snapshots[].resources[].aggregated-on` | array | no | Present only when the resource has aggregated sub-resources |
| `snapshots[].resources[].aggregated-on[].name` | string | yes | Internal sub-resource name |
| `snapshots[].resources[].aggregated-on[].readableName` | string | yes | Human-readable sub-resource name |
| `snapshots[].resources[].aggregated-on[].usage` | number | yes | Usage count for the sub-resource at that snapshot |

### Notes

- The tool queries a customer subaccount only; `customer_guid` is required.
- Large date ranges are split into 7-day chunks internally, then merged into a single chronologically sorted snapshot list.
- The request body includes `billable=true` and `show-aggregations=true`.
