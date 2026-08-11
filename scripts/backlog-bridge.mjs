import { spawn } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG = join(homedir(), '.backlog', 'state', 'logs', 'runtime', 'backlog-bridge.log');
const log = (m) => { try { appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`); } catch {} };

const PORT = Number(process.env.BACKLOG_VIEWER_PORT || 3030);
const root = 'C:/Users/dlzhi/OneDrive/Desktop/TEST/New C/.mcp/node_modules';
const serverPath = `${root}/backlog-mcp/dist/node-server.mjs`;
const mcpRemotePath = `${root}/mcp-remote/dist/proxy.js`;

async function isServerUp(port) {
  try {
    const r = await fetch(`http://localhost:${port}/version`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

async function ensureServer(port) {
  if (await isServerUp(port)) return;
  mkdirSync(join(homedir(), '.backlog', 'state', 'logs', 'runtime'), { recursive: true });
  const child = spawn(process.execPath, [serverPath], {
    detached: true, stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, BACKLOG_VIEWER_PORT: String(port) }
  });
  child.unref();
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isServerUp(port)) return;
  }
  throw new Error('backlog node-server failed to start on port ' + port);
}

async function main() {
  await ensureServer(PORT);
  const args = [
    `http://localhost:${PORT}/mcp`,
    '--allow-http', '--transport', 'http-only',
    '--header', 'backlog-home:global'
  ];
  const bridge = spawn(process.execPath, [mcpRemotePath, ...args], {
    stdio: ['inherit', 'inherit', 'pipe'], env: process.env
  });
  bridge.stderr.on('data', d => process.stderr.write(d));
  bridge.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((e) => { log('FATAL ' + e.message); process.exit(1); });
