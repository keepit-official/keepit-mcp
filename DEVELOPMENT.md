### Developing the Keepit MCP server

Alongside the Keepit MCP server, we have a dedicated **Proxy server**. This server acts as a wrapper around the MCP and allows us to **test new or existing MCP tools locally** without the need to repeatedly create MCPB packages.

The Proxy server is an **HTTP server** that listens for incoming requests (e.g., from Postman) and forwards them to the MCP server.  
Responses from the MCP server are then sent back through the Proxy to the HTTP client.

This setup is always available during development and enables us to **debug and test everything locally in real-time**, making development and troubleshooting much faster and more convenient.

![KEEPIT_MCP](public/KEEPIT_PROXY_AND_MCP.png)


#### Run the Keepit MCP server locally in development mode:
  - In the project root, create an `.env` file to store your configuration:
    ```bash
    nano .env or vim .env

  - Inside the created `.env` file, add the following environment variables (values shown as examples):
    ```bash
    KEEPIT_USER=OgGvCVqJDkPVql=?75AXDIBM
    KEEPIT_PASS=55Z,oS0yn8n.esNdrjvZgfEE
    KEEPIT_ENV=ws-test
    LOCAL_PORT=5000
    ```
    - **Note:**  The LOCAL_PORT field is optional. If not specified, the server will run on http://127.0.0.1:3000
   
  - Run the following command to start the development server:
    ```bash
    npm start

#### Test the Keepit MCP server locally in development mode, using any API client to send requests:
  - Open the API client.
  - Use the following request params:
    ```bash
    Request type: POST
    Request URL: http://localhost:3000/ (or port which you set in .env file)
    Body: raw/JSON
    Textfield:
       {
          "requestName": "TOOL_NAME"
       }
  
       OR
    
       {
            "requestName": "TOOL_NAME",
            "argumentsList": {
                "ARGUMENT_NAME": "ARGUMENT_VALUE"
            }
        }
    ```
    For example:
    ```bash
    {
        "requestName": "get_active_jobs",
        "argumentsList": {
            "guid": "etabjx-opdiwv-lkxb6e"
        }
    }
    ```

#### Testing with Postman's Native MCP Support

Postman provides native support for MCP servers, allowing you to test the Keepit MCP server directly within Postman. This approach is simpler than using the HTTP Proxy server for testing.

**Steps to test:**

1. **Start the Keepit MCP server:**
   ```bash
   npm start
   ```

2. **Open Postman and create an MCP request:**
   - Open Postman and navigate to your workspace
   - Click on the `New` button to create a new request
   - Select request type: **MCP Request** (instead of HTTP)

3. **Configure the MCP server connection:**
   - In the MCP request panel, configure the server settings:
     - **Server type**: stdio
     - **Command**: `node` (or your Node.js path)
     - **Arguments**: `<path-to-keepit-mcp>/build/main.js`
     - **Environment variables**: Add your environment variables (KEEPIT_USER, KEEPIT_PASS, KEEPIT_ENV)

4. **Send MCP tool requests:**
   - Once connected, Postman will discover and display all available MCP tools from the Keepit MCP server
   - Select a tool from the list and configure its parameters
   - Send the request to test the tool's functionality

For more detailed information about Postman's MCP support, see [Postman's MCP documentation](https://learning.postman.com/docs/postman-ai/mcp-requests/overview/).

#### Testing with MCP Inspector

The MCP Inspector is a built-in debugging tool that allows you to test and inspect MCP servers directly from the command line. It provides a web-based UI to interact with your MCP server and inspect all available tools and their responses.

**Steps to test:**

1. **Ensure your MCP server is built:**
   ```bash
   npm run prod
   ```

2. **Run MCP Inspector with your Keepit MCP server:**
   ```bash
   npx @modelcontextprotocol/inspector node build/main.js
   ```

3. **Access the inspector UI:**
   - The command will output a local URL (typically `http://localhost:5173`)
   - Open this URL in your web browser
   - The inspector will display all available tools from the Keepit MCP server

For more information about MCP Inspector, see the [official MCP documentation](https://modelcontextprotocol.io/docs/tools/inspector).

## Tool Development

This section describes how tools are implemented in Keepit MCP, providing a pattern for developers to follow when creating new tools.

### Architecture Overview

Keepit MCP uses a modular, composable tool architecture with three distinct layers for each tool category:

```
┌─────────────────────────────────────────┐
│  Tool Definitions & Schemas             │
│  - Defines tool name, description       │
│  - Specifies input/output schemas (JSON)│
│  - Declares required ACL permissions    │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│  Tool Handlers (Business Logic)         │
│  - Implements tool execution            │
│  - Validates inputs & handles errors    │
│  - Calls helper functions               │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│  Tool Helpers (API & Data Logic)        │
│  - Makes API requests                   │
│  - Transforms data                      │
│  - Returns structured results           │
└─────────────────────────────────────────┘
```

### File Structure

Each tool category has a dedicated folder with three files:

```
src/tools/
├── [category]/
│   ├── [category]-tools-definitions.ts      # Tool schemas & metadata
│   ├── [category]-tools-handler.ts          # Tool execution logic
│   └── [category]-tools.helper.ts           # API & business logic
├── index.ts                                  # Tool aggregation & export
└── tools.interfaces.ts                       # Shared TypeScript types
```