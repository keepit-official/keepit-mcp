/**
 * Runtime process entrypoint for the compiled MCP server.
 *
 * The actual server construction and stdio wiring live in the transport and
 * server modules; this file only loads environment variables and starts the
 * stdio transport flow.
 */
import 'dotenv/config';
import { runMcpServerOverStdio } from './transport/stdio.js';

await runMcpServerOverStdio();
