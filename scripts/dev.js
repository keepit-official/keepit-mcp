/**
 * Local development launcher.
 *
 * It runs the TypeScript compiler in watch mode and starts the HTTP dev proxy
 * through nodemon so the compiled MCP server can be exercised interactively.
 */
import spawn from "cross-spawn";

const build = spawn("tsc", ["--watch"], { stdio: "inherit" });
const proxy = spawn("nodemon", ["scripts/proxy-mcp.js"], { stdio: "inherit" });
// Build project into "build" folder
build.on("close", (code) => {
  console.log(`build:watch exited with code ${code}`);
});
// Start nodemon with build/main.js and linter
proxy.on("close", (code) => {
  console.log(`proxy-server exited with code ${code}`);
});
