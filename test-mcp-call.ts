import { spawn } from 'child_process';

const child = spawn('npx.cmd', ['tsx', '"C:/Users/Anirudh Bhardwaj/Desktop/nexusHR/mcp-server/index.ts"'], {
  shell: true,
  env: {
    ...process.env,
    NEXUS_AUTH_TOKEN: 'nx_mcp_live_6ae09796a83eeca0',
    NEXUS_USER_EMAIL: 'anirudh@abacasys.com',
    NEXUS_PERMISSIONS: 'read,write',
    NEXUS_MODULES: 'tasks,attendance,leave,notices,employees'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

const initMessage = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
}) + '\n';

const callToolMessage = JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'get_current_user_profile',
    arguments: {}
  }
}) + '\n';

child.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('Server running and listening on stdio')) {
    child.stdin.write(initMessage);
  }
});

let buffer = '';
child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1) {
        child.stdin.write(callToolMessage);
      } else if (parsed.id === 2) {
        console.log('Tool Call Result:\n', JSON.stringify(parsed, null, 2));
        child.kill();
        process.exit(0);
      }
    } catch (e) {}
  }
});

setTimeout(() => {
  console.log('Timeout waiting for response');
  child.kill();
  process.exit(1);
}, 20000);

