## Scope and Support Posture

This repository is documented as an independent fork intended to help MSPs get started with an MSP-oriented Keepit MCP implementation.

Current support posture for this fork:

- No ongoing maintenance commitment or response SLA is promised in this repository.
- Security fixes may be made on a best-effort basis.
- This file does not represent an official Keepit support or incident-response commitment for the fork.

### Credential Management

For production use, we recommend using a secrets manager instead of storing credentials in clear text file. The MCP reads credentials from environment variables, so any method that injects `KEEPIT_USER`, `KEEPIT_PASS`, and `KEEPIT_ENV` will work.

### Reporting Guidance

- Do not post real credentials, tenant data, access tokens, or exploit material in public issues.
- If GitHub private vulnerability reporting is enabled for the fork, prefer that channel for sensitive reports.
- If no private reporting channel is enabled, sanitize the report first or handle it through a private communication path you control before publishing details.

### Basic Setup (Non-Encrypted)

Pass credentials directly in your MCP client configuration.

The Claude configs are typically stored in these paths:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "keepit": {
      "command": "node",
      "args": ["/path/to/keepit-mcp/build/main.js"],
      "env": {
        "KEEPIT_USER": "your-username",
        "KEEPIT_PASS": "your-password",
        "KEEPIT_ENV": "us-dc"
      }
    }
  }
}
```
_Credentials are passed directly in your MCP client configuration. While not encrypted, this keeps secrets out of your project repository, preventing accidental Git commits._


### Using 1Password CLI (Cross-Platform)

1Password CLI (`op`) works on macOS, Linux, and Windows. Adjust the `node` path according to your deployment.
In order to use it via CLI, you have to enable 1Password CLI in the 1Password desktop app Settings > Developer and allow biometric unlock.

**Documentation:** [1Password CLI: Getting Started](https://developer.1password.com/docs/cli/get-started/) | [Secret References](https://developer.1password.com/docs/cli/secret-references/)

**Path examples:**
- **macOS/Linux:** `/path/to/keepit-mcp/build/main.js`
- **Windows:** `C:/path/to/keepit-mcp/build/main.js`

```json
{
  "mcpServers": {
    "keepit": {
      "command": "op",
      "args": ["run", "--", "node", "/path/to/keepit-mcp/build/main.js"],
      "env": {
        "KEEPIT_USER": "op://Private/Keepit/username",
        "KEEPIT_PASS": "op://Private/Keepit/password",
        "KEEPIT_ENV": "op://Private/Keepit/datacenter"
      }
    }
  }
}
```

### Windows User Environment Variables

> **Note:** This option is for Windows users. Credentials are stored in the Windows Registry (unencrypted) but kept separate from the config file, reducing the risk of accidental sharing.

Set the following as User Environment Variables (see [Microsoft's guide on environment variables](https://learn.microsoft.com/en-us/windows/win32/shell/user-environment-variables)):

- `KEEPIT_USER` : `your-username`
- `KEEPIT_PASS` : `your-password`
- `KEEPIT_ENV` : `us-dc`

Restart Claude Desktop after adding the variables.

Then use this config no `env` block needed:
```json
{
  "mcpServers": {
    "keepit": {
      "command": "node",
      "args": ["C:/Users/YourName/keepit-mcp/build/main.js"]
    }
  }
}
```

**Security note:** This approach stores credentials as plaintext in the Windows Registry. Any process running as your user can read them. The benefit over the basic setup is that credentials won't be accidentally shared when copying config files.

### macOS Keychain

**Documentation:** [Keychain Access User Guide](https://support.apple.com/guide/keychain-access/welcome/mac) | [security command man page](https://ss64.com/mac/security.html)

**Option A: Using Keychain Access GUI**

1. Open **Keychain Access** (Applications → Utilities → Keychain Access)
2. Select **login** keychain in the sidebar
3. Click **File → New Password Item** (or press ⌘N)
4. Create two entries:
   - Keychain Item Name: `keepit-mcp-username`, Account: `keepit`, Password: `your-username`
   - Keychain Item Name: `keepit-mcp-password`, Account: `keepit`, Password: `your-password`

**Option B: Using Terminal**

```bash
security add-generic-password -s "keepit-mcp-username" -a "keepit" -w "your-username"
security add-generic-password -s "keepit-mcp-password" -a "keepit" -w "your-password"
```

**Claude Desktop config** (uses `security find-generic-password` to retrieve at runtime):
```json
{
  "mcpServers": {
    "keepit": {
      "command": "sh",
      "args": [
        "-c",
        "KEEPIT_USER=$(security find-generic-password -s keepit-mcp-username -a keepit -w) KEEPIT_PASS=$(security find-generic-password -s keepit-mcp-password -a keepit -w) KEEPIT_ENV=us-dc node /path/to/keepit-mcp/build/main.js"
      ]
    }
  }
}
```

### Linux secret-tool (GNOME Keyring / libsecret)

**Documentation:** [libsecret / secret-tool](https://wiki.gnome.org/Projects/Libsecret) | [secret-tool man page](https://manpages.ubuntu.com/manpages/jammy/man1/secret-tool.1.html)

First, store credentials (one-time):
```bash
secret-tool store --label="Keepit MCP Username" service keepit-mcp field username
secret-tool store --label="Keepit MCP Password" service keepit-mcp field password
```

Then in your MCP client config (e.g., Claude Code's `~/.claude.json` or similar):
```json
{
  "mcpServers": {
    "keepit": {
      "command": "sh",
      "args": [
        "-c",
        "KEEPIT_USER=$(secret-tool lookup service keepit-mcp field username) KEEPIT_PASS=$(secret-tool lookup service keepit-mcp field password) KEEPIT_ENV=us-dc node /path/to/keepit-mcp/build/main.js"
      ]
    }
  }
}
```
