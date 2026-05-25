# Example Prompts for Claude Desktop with Keepit MCP

This document provides example prompts you can use with Claude Desktop when connected to the Keepit and Microsoft Entra ID (Azure AD) MCP servers. The prompts are organized by complexity and use case, covering all available MCP tools — for both individual Keepit customers and partners managing multiple accounts through the Partner Management Console (PMC).

## Partner Management (PMC)

### Account Overview
- "List all customer accounts I manage"
- "Show me my partner account details"
- "Get information about a specific customer account"

### Critical Connector Monitoring
- "Show me all critical connectors across all my customer accounts"
- "Get the connector health summary for customer [GUID]"
- "One of my customers has a failing connector — what's wrong and how do they fix it?"

### Seat Usage & Limits
- "Which of my customer accounts are exceeding their seat limits?"
- "Show me seat allocation breakdown for the past month"
- "Get seat usage history for customer [GUID] for the past quarter"
- "Are any of my customers approaching their Microsoft 365 seat limits?"

### Audit & Compliance
- "Show me audit log activity across all my customers for the past week"
- "Get audit logs for a specific customer for the past 24 hours"

## 🔧 Basic Operations

### Connector Management
- "List all my Keepit connectors"
- "Do I have any unhealthy connectors?"
- "Show me the health status of all my connectors"
- "Get connector anomalies for my Office 365 connector"
- "Show me backup summary for azure-ad connector type"

### Job & Backup Monitoring
- "Get the most recent backup job information"
- "Show me all active backup jobs"
- "Get job history for the past week"
- "Get the latest snapshot for my connector"
- "Show me snapshot range from last week to now"

### Audit & Compliance
- "Show me failed audit logs from the past day"
- "Get audit log history with duration PT6H"
- "Show me my current resource usage"
- "Am I violating any resource limits?"
- "Check my resource compliance status"
- "Get my M365 seat usage"

### Microsoft 365 Integration (Lokka)
- "Get all users in my tenant"
- "List all Azure AD groups"
- "Show me all guest users in my directory"
- "List the admin users in my tenant"
- "Find all disabled user accounts"

## 🔍 Discovery & Browsing

### Backup Content Exploration
- "Browse the backup content of my Office 365 connector"
- "Show me what's in the /Users path of my backup"
- "Browse SharePoint sites in my backup"
- "Find all email data in my latest snapshot"
- "Explore the backup structure for user john@company.com"
- "Browse my backup content"
- "Show me what's in my latest backup"
- "Browse the user folders in my Microsoft 365 backup"
- "Show me the structure of my SharePoint backup"
- "Browse my Teams backup and restore all channels"

### Data Discovery
- "What types of data are backed up in my connectors?"
- "Show me the folder structure of my OneDrive backup"
- "List all SharePoint sites that are being backed up"
- "Find all Teams data in my backup"

## 📊 Data Comparison & Analysis

### Backup Data Comparison
- "Compare backup data between two snapshots for user john@company.com"
- "Show me what changed in SharePoint sites between last week and this week"
- "Compare email data across different time periods"
- "Analyze differences in OneDrive content over the past month"

### Universal Data Comparison
- "Compare data across different connector types for the same user"
- "Show differences between production and backup data"
- "Compare user permissions across multiple snapshots"
- "Analyze data changes across all connectors for compliance audit"

## 📈 Resource Management & Optimization

### Resource Monitoring
- "Show me resource usage history for the past month with trends"
- "Get a billing summary of all my resources grouped by connector"
- "Identify which resources are approaching their limits (>80% usage)"
- "Check my compliance status and tell me if I have a grace period"
- "Compare resource usage between different connector types"

### Cost Optimization
- "Create a cost optimization report identifying underutilized resources"
- "Calculate the cost per user for each connector type based on resource usage"
- "Identify seasonal patterns in resource consumption for capacity planning"
- "Analyze resource usage trends over the past quarter and predict when I'll hit limits"
- "Generate a resource compliance audit report with violation history"

## 🔗 Cross-Platform Intelligence

### Basic Cross-Platform Queries
- "List all Microsoft 365 users and check if they're being backed up in Keepit"
- "Compare the licensed users in my tenant with users being backed up"
- "Show me backup health status for all admin users"
- "Check if any Guest users are included in my Keepit backups"
- "Identify users with MFA disabled and their backup status"

### Advanced Cross-Platform Analysis
- "Create a comprehensive backup compliance report for each department in my organization"
- "Find all Microsoft 365 admin users who don't have recent successful backups and prioritize by risk level"
- "Analyze my tenant for security risks and identify which critical data may not be adequately backed up"
- "Compare user activity patterns with backup activity to identify potential data loss scenarios"
- "Generate a disaster recovery readiness report showing backup coverage for critical services and users"
- "Identify critical files from users with privileged access and create a targeted restore plan"

## 🎯 Expert-Level Scenarios

### Compliance & Governance
- "Generate a data governance report showing data access permissions, external sharing, and backup verification for sensitive information"
- "Find all users in regulated departments (Legal, Finance) and verify their backup compliance against regulatory requirements"
- "Create a comprehensive security and data protection assessment that combines Microsoft 365 security posture with Keepit backup coverage"
- "Audit all external sharing permissions in my tenant and identify security risks"
- "Generate a security posture assessment based on MFA adoption, suspicious sign-ins, and admin practices"

### Advanced Analytics & Optimization
- "Analyze the relationship between user activity patterns and backup anomalies to identify potential optimization opportunities"
- "Calculate the average backup completion time for each connector type and identify outliers"
- "Find any gaps in my backup schedule where protected data might be at risk"
- "Analyze my backup health trends over the past month and identify recurring issues"
- "Create a prioritized list of backup issues that need addressing based on data criticality"

### Enterprise Operations
- "Create a multi-service disaster recovery plan identifying critical users, data, and systems with their backup status and recovery procedures"
- "Orchestrate a complex restoration workflow spanning multiple connectors and time periods"
- "Plan and execute a comprehensive data migration using backup and restore capabilities"
- "Design a backup strategy that balances cost, compliance, and recovery objectives"
- "Create automated workflows for backup monitoring, alerting, and remediation"
- "Implement a targeted restore strategy for all financial documents accessed during suspicious login periods and analyze for potential data exfiltration"

## 🔧 Technical Operations

### API & Token Management
- "Manage API tokens for secure connector access"
- "Rotate API credentials across all connectors"
- "Test API connectivity and authentication status"
- "Configure secure token storage and access policies"

### Advanced Monitoring
- "Monitor restoration progress across multiple concurrent jobs"
- "Set up automated alerts for backup failures and anomalies"
- "Create dashboards showing backup health across all connectors"
- "Implement proactive monitoring for resource limit violations"

### Integration & Automation
- "Integrate backup status with existing ITSM workflows"
- "Automate backup verification and integrity checking"

## 📋 Use Case Categories

### **IT Operations Teams**
Focus on: Connector management, job monitoring, resource optimization, automated scheduling

### **Compliance Officers**
Focus on: Audit logs, compliance reporting, data governance, regulatory verification

### **Security Teams**
Focus on: Cross-platform analysis, security posture assessment, disaster recovery planning

### **Business Continuity Managers**
Focus on: Disaster recovery simulation, business impact analysis, recovery strategy comparison

### **Data Protection Officers**
Focus on: Data discovery, backup verification, privacy compliance, data lifecycle management

### **MSP/Service Providers**
Focus on: Multi-tenant operations, automated workflows, cost optimization, service level monitoring
### **Partners (PMC)**
Focus on: Multi-account monitoring, critical connector triage, seat limit management, cross-account audit review
