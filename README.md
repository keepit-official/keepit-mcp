# Keepit MCP

## About
Keepit MCP is Keepit's Model Context Protocol (MCP) server for use with Claude Desktop or other applications that support
local stdio-based MCP servers. Keepit MCP's tools help you monitor, manage, and secure your Keepit environment using AI.

Keepit MCP provides integration with **Keepit** for backup and data protection services. It can be used by:
- **Customers** — to manage and monitor their own Keepit account
- **Partners** — to manage and monitor all customer accounts through the Keepit Partner Management Console (PMC)

Keepit MCP allows you to use natural language — [Claude Desktop](https://support.anthropic.com/en/articles/10065433-installing-claude-for-desktop) or any MCP client — to interact with your Keepit account or your customers' accounts through the Keepit REST API.

Example queries:
- `Do I have any unhealthy connectors?`
- `Show me failed audit logs with duration PT6H`
- `Get all users in my tenant` (with Lokka integration)
- `Show me all critical connectors across my managed accounts` (partners)
- `Which of my customer accounts are exceeding their seat limits?` (partners)

To get a sense of what's possible with Keepit MCP, we've provided a comprehensive set of example prompts in [PROMPTS.md](PROMPTS.md).

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI assistants like Claude to interact with external tools and data sources. MCP servers act as bridges between an LLM and external services, allowing the LLM to:

- Retrieve data from external systems
- Execute commands on those systems
- Present the results back to the user

Claude Desktop can connect to multiple MCP servers simultaneously, each providing access to different services. Microsoft has added support for MCP to VSCode and Copilot Studio and is adding MCP tools as first-class apps in an upcoming release of Windows 11. Many other tools can consume MCP servers as well.

## Safety and security
Keepit MCP runs as a local MCP server on your local machine. As you can see from inspecting the code, it does not have access to the local filesystem or machine. However,
depending on what other MCP servers you have configured, the LLM you use may have access to local or remote files (including through Google Drive or OneDrive),
the ability to send mail, and other capabilities. We have put guardrails in place (strict type safety, input and schema validation, etc.), but the ultimate protection
for your Keepit account is to safeguard the API token you use for running Keepit MCP, including making sure that it has the least privilege necessary to run the tools you
want to use.

You should also note that it is possible that the LLM you use may take actions you didn't explicitly command. Be careful when testing prompts to ensure that an over-eager LLM construction won't result in an action that damages important data. 

## Architecture
Keepit MCP is written as a collection of [MCP tools](https://modelcontextprotocol.io/docs/concepts/tools). There are tools for
connectors, audit logs, jobs, snapshots, and so on. This approach was chosen to make implementation easier. It's a little clunky for the end user because they must consent to every individual tool – it might be worth refactoring to combine multiple tool handlers into one. However, the big advantage of this approach is that MCP tools are composable, so users can easily create prompts/queries that take results from different tools (and thus from different services). 

An example: "We had an outage yesterday. For all connectors:
1. Show health status now
2. Show job history for P2D - any spike in failures?
3. Show audit logs for P2D - any config changes or unusual admin activity?
4. Cross-reference: which connectors had both failed jobs AND audit events within the same 2-hour window?"

Each tool contains the logic required to request a specific item type and return it in a format that the LLM can consume.
The tool definitions specify the input schema for each individual tool, and the tool handler (which actually does the work for the tool) may return
structured results or simple items like a string or GUID.

## Installation
To use the **Keepit MCP server** for either production or development, you need to install the repository on your local machine.  

Follow the steps below to set up the project environment:
1. **Install the required software (if not already installed):**
    - [Git](https://git-scm.com/downloads)
    - [Node.js](https://nodejs.org/en/download) — version `≥ 22.10.0`
    - Recommended:
        - [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro) for easy Node.js version management
        - [npm](https://www.npmjs.com/get-npm) — check your version (should be `≥ 10.9.2`):
       ```bash
       npm -v

2. **Clone the repository:**
   ```bash
   git clone https://github.com/keepit-official/keepit-mcp.git
   
3. After cloning the repository, open the project folder:
    ```bash
    cd keepit-mcp

4. Install dependencies using the command:
     ```bash
     npm install 

## Usage
This project can be used for:

1. Сreating MCPB package
2. Installing MCPB package into Claude
3. Run Keepit MCP server with MCP clients that support `stdio` transport
4. Developing the Keepit MCP server

**Note:** Before proceeding, make sure the project is properly installed (see the [Installation](#installation) section).

### Create MCPB package
- Open the project folder:
  ```bash
  cd keepit-mcp

- Run the build command:
  ```bash
  npm run generate-mcpb

- After a successful build, the `keepit-mcp.mcpb` file will be generated.

### Installing MCPB package into Claude
- Download and install the desktop version of Claude [Claude Desktop Download](https://claude.ai/download) (if not already installed)
- In the Claude app, go to: `Settings > Extensions > Advanced settings`
- Click `Install Extension...`
- In the popup, select the previously generated MCPB package (`keepit-mcp.mcpb`) and click Install.
- Upon installation, you will be prompted with a popup requiring your Keepit account credentials: login, password, and the region where your account is hosted.
    - **Note:**  We highly recommend using a secondary token (instead of your main login/password) for authentication. You can create one in the Keepit Web App: (`User info page > Security tab > Secondary tokens`)
- Enable the newly installed extension.

### Run the Keepit MCP Server in Production Mode: 
  - We highly recommend that you read our [security recommendations](./SECURITY.md).

## Legal Disclaimer for Keepit MCP Server
This software ("Keepit MCP") is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall Keepit A/S or the authors be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

## Limitation of Liability
To the maximum extent permitted by law, Keepit A/S and its affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, loss of data, revenue, profits, or business opportunities, system downtime, security breaches, or unauthorized access, costs of procurement of substitute services or technology, and damages arising from reliance on AI-generated recommendations or actions.

## Indemnification
Users agree to indemnify and hold harmless Keepit and its affiliates from any claims, damages, losses, or expenses arising from use or misuse of the Keepit MCP server, violation of third-party terms of service or acceptable use policies, non-compliance with applicable laws or regulations, unauthorized access, or security incidents related to user credentials.

## Service Availability and Performance
Keepit makes no guarantees regarding availability, performance, or reliability of the Keepit MCP server, compatibility with future versions of Claude Desktop, MCP protocol, or integrated APIs, continued support, updates, or maintenance of this software, response times, error handling, or system stability.

## API Integration and Data Security
Third-Party API Dependencies: Keepit MCP integrates with external APIs, including Keepit and Microsoft services. Users are responsible for complying with all applicable API terms of service and acceptable use policies, managing their own API credentials, tokens, and access permissions securely, ensuring proper security practices when handling API keys and authentication tokens, monitoring their usage and associated costs across all integrated services.

## Data Flow and Privacy
Users acknowledge that:

- All prompts, API responses, and data transmitted through this software may be processed by third-party AI services and their associated data processors via servers that may be located in various jurisdictions, including but not limited to the United States.
- Backup data, credentials, and operational commands flow through multiple systems.
- Data may be transmitted across different geographic regions and cloud providers.
- Users are responsible for ensuring compliance with applicable data protection regulations (GDPR, CCPA, etc.).

## AI-Powered Operations and Risk Management
This software uses AI interpretation to execute commands against production backup and restore systems. Users assume all responsibility for actions taken by the AI system, including unintended or over-eager responses, data restoration, deletion, or modification operations initiated through natural language commands, verification of AI-interpreted commands before execution, particularly for any potentially destructive operations, implementing appropriate safeguards, testing procedures, and understand rollback capabilities if any.

## Updates and Modifications
This disclaimer may be updated at any time without notice. Continued use of the software constitutes acceptance of any modifications to these terms.
