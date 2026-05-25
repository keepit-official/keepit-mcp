import express from 'express';
import { spawn } from 'child_process';
import 'dotenv/config.js';

const app = express();
const PORT = process.env.LOCAL_PORT || 3000;

app.use(express.json());

app.post('/', async (req, res) => {
  const requestBody = req.body;

  const serverProcess = spawn('node', ['./build/main.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: requestBody?.requestName,
      arguments: requestBody?.argumentsList ?? {} // Keep MCP `params.arguments` as an object. This is needed for tools with optional argumentsList.
    }
  };

  // Send JSON-RPC request
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  serverProcess.stdin.end();

  // Wait for response as a Promise
  const responsePromise = new Promise((resolve, reject) => {
    let responseData = '';

    serverProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    serverProcess.stdout.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse JSON-RPC response: ${JSON.stringify(err)}`));
      }
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });
  });

  try {
    const response = await responsePromise;
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Execution error' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ MCP Proxy API listening at http://127.0.0.1:${PORT}`);
});
