# Example Prompts for Claude Desktop with the Keepit MSP MCP Server

This document provides example prompts you can use with Claude Desktop when connected to this MCP server. All operations are read-only.

## Available Tools

| Tool | What it does |
| --- | --- |
| `get_cloud_connectors` | List all cloud backup connectors in the account |
| `get_connector_health` | Health status for a connector (by GUID or by name) |
| `get_active_jobs` | Currently running backup or restore jobs for a connector |
| `get_job_history` | Job history for a connector over a duration or date range (max 90 days) |
| `get_audit_log_history` | Audit log events for a given time period (max 365 days) |
| `get_latest_snapshot` | Most recent completed snapshot timestamp for a connector |
| `get_snapshot_range` | List of snapshots within a time range for a connector |

---

## Basic Operations

### Account & Connectors

- "Show me my account information"
- "List all my Keepit connectors"
- "Do I have any unhealthy connectors?"
- "Check the health of my Office 365 connector"
- "What connectors do I have and when were they created?"
- "Is my azure-ad connector healthy?"

### Job Monitoring

- "Show me all currently active backup jobs for connector [GUID]"
- "Get job history for the past 7 days for connector [GUID]"
- "Were there any failed backup jobs in the last 24 hours?"
- "Show me job history for the past month for connector [name]"
- "What backup jobs ran yesterday for my Office 365 connector?"

### Snapshots

- "Get the latest snapshot for connector [GUID]"
- "Show me snapshots from the last 7 days for my Office 365 connector"
- "When was the last successful backup for connector [name]?"
- "List the most recent 10 snapshots for connector [GUID] in reverse order"

### Audit Logs

- "Show me audit log activity for the past 24 hours"
- "Get audit logs for the past 7 days"
- "What actions were taken in this account over the past month?"
- "Were there any failed access attempts in the audit log this week?"

---

## Operational Queries

### Health & Status Overview

- "Give me a health summary of all my connectors"
- "Are any connectors in a critical or unhealthy state?"
- "Which connectors haven't had a recent successful backup?"
- "Show me the current status of all connectors"

### Job Analysis

- "Show me job history for the past 30 days and identify any failures"
- "How many backup jobs ran last week for connector [GUID]?"
- "Were there patterns in backup failures over the past month?"
- "Get job history from 2025-01-01 to 2025-01-31 for connector [GUID]"

### Snapshot Analysis

- "How frequently are snapshots being taken for connector [GUID]?"
- "Show me a week's worth of snapshots for connector [GUID]"
- "Get snapshots from the past month for connector [name] — are there any gaps?"

### Audit & Compliance

- "Summarise all audit activity for the past 30 days"
- "Review the audit log for the past week and flag anything unusual"
- "How many audit events were there in the last month?"

---

## MSP & Multi-Account Operations

- "Give me a full account overview: connectors, recent jobs, and health status"
- "Check all connectors for issues and produce a health report"
- "Show me job failures from the past 7 days across all connectors"
- "Produce a backup status summary — connector list, latest snapshots, and recent job activity"
- "Review audit logs for the past month and flag anything that needs attention"
- "Get job history across all connectors for the past week and summarise it"

---

## Scenario Prompts

### Daily Backup Check

"Do a daily backup check: list any unhealthy connectors, show active jobs, and check for job failures in the last 24 hours."

### Weekly Status Report

"Prepare a weekly backup report: account status, connector health, job success rate over the past 7 days, and notable audit events."

### Incident Investigation

"There may have been a backup issue yesterday. Get job history for the past 48 hours and audit logs for the same period — help me understand what happened."

### Snapshot Coverage Review

"Show me all snapshots for the past month for connector [GUID] and tell me if there are any gaps in the schedule."

### Connector Health Check

"Check the health of every connector. For any that are unhealthy or critical, show me recent job history so I can understand what's failing."

---

## Use Case Categories

### IT Operations Teams

Connector health monitoring, active job tracking, job failure triage, snapshot verification

### Compliance Officers

Audit log review, activity history, access event analysis

### MSP / Service Providers

Per-account health checks, multi-connector job summaries, audit reporting across accounts

### Business Continuity Managers

Snapshot coverage verification, backup frequency analysis, failure trend identification
