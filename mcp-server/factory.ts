import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProfileTools } from './tools/profile';
import { registerTaskTools } from './tools/tasks';
import { registerLeaveTools } from './tools/leaves';
import { registerAttendanceTools } from './tools/attendance';
import { registerEmployeeTools } from './tools/employees';
import { registerNoticeTools } from './tools/notices';

export function createNexusMcpServer(): McpServer {
  const server = new McpServer({
    name: 'nexushr-mcp',
    version: '1.0.0',
  });

  registerProfileTools(server);
  registerTaskTools(server);
  registerLeaveTools(server);
  registerAttendanceTools(server);
  registerEmployeeTools(server);
  registerNoticeTools(server);

  return server;
}

