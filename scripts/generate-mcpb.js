import { execSync } from "child_process";

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const runNodeModule = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(`npx ${cmd}`, { stdio: "inherit" });
};
// Remove files and folders
runNodeModule('rimraf ./build ./export keepit-msp-mcp.mcpb');
// Build project
run("npm run build");
// Sync manifest metadata from runtime tool definitions for packaging
run("npm run sync:manifest");
// Copy all needed files and folders into "export" folder
runNodeModule('copy-files-from-to');
// Install production modules in "export" folder
run("npm install --prefix ./export --omit=dev");
// Generate MCPB-file from "export" folder
run("npx @anthropic-ai/mcpb pack ./export keepit-msp-mcp.mcpb");
