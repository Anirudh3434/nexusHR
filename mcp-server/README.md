# NexusHR MCP Server (Role & Permission Gated)

Model Context Protocol (MCP) server for **NexusHR**, allowing AI coding assistants and agent frameworks (Claude Desktop, Cursor, Antigravity, Windsurf) to securely interact with HRM data while strictly adhering to user permissions and role boundaries.

---

## 🔒 Permission & Security Model

The MCP server enforces the exact same authorization matrix as the NexusHR web application:

| Action / Module | Super Admin / Admin | HR | Manager | Employee |
| :--- | :---: | :---: | :---: | :---: |
| **Profile & Permissions** | Full | Full | Full | Self Profile |
| **View Tasks** | All Tasks | All Tasks | Project/Team Tasks | Assigned Only |
| **Create Task** | ✅ Yes | ✅ Yes | ✅ Yes | If permitted |
| **Clock In / Out** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (Self) |
| **View Attendance** | All Company | All Company | Team / Self | Self Only |
| **Apply Leave** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Approve / Reject Leave** | ✅ Yes | ✅ Yes | ✅ Yes (Team) | ❌ Forbidden |
| **Employee Directory** | All (+ Salaries) | All (+ Salaries) | Team / Basic | Basic (No Salaries) |
| **Post Company Notice** | ✅ Yes | ✅ Yes | ❌ Forbidden | ❌ Forbidden |

---

## 🚀 Quick Start

Run the server directly:
```bash
npm run mcp
```

Or run via `tsx`:
```bash
npx tsx mcp-server/index.ts
```

---

## ⚙️ Configuration for MCP Clients

### 1. Claude Desktop
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "nexushr": {
      "command": "npx",
      "args": ["-y", "tsx", "c:/Users/Anirudh Bhardwaj/Desktop/nexusHR/mcp-server/index.ts"],
      "env": {
        "NEXUS_USER_EMAIL": "your-email@company.com"
      }
    }
  }
}
```

### 2. Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "nexushr": {
      "command": "npx",
      "args": ["-y", "tsx", "c:/Users/Anirudh Bhardwaj/Desktop/nexusHR/mcp-server/index.ts"],
      "env": {
        "NEXUS_USER_EMAIL": "your-email@company.com"
      }
    }
  }
}
```

### 3. Antigravity / Agentic Frameworks
```json
{
  "nexushr": {
    "command": "npx",
    "args": ["-y", "tsx", "c:/Users/Anirudh Bhardwaj/Desktop/nexusHR/mcp-server/index.ts"],
    "env": {
      "NEXUS_USER_EMAIL": "admin@abaca.com"
    }
  }
}
```

---

## 🛠️ Available MCP Tools

1. **`get_current_user_profile`**: Inspect authenticated user profile, designation, department, and accessible modules.
2. **`check_permission`**: Check if the user is authorized to perform `view`, `create`, `edit`, `delete`, or `approve` on any HRM module.
3. **`list_tasks`**: List project tasks with status and priority filtering. (Respects role boundaries).
4. **`create_task`**: Create a new task within a project.
5. **`update_task_status`**: Change task progress (e.g., `to_do`, `in_progress`, `completed`).
6. **`get_leaves`**: Retrieve leave requests and status.
7. **`apply_leave`**: Submit a personal leave application.
8. **`approve_or_reject_leave`**: Approve or reject pending leaves (Manager/HR/Admin only).
9. **`clock_in`**: Record today's check-in timestamp.
10. **`clock_out`**: Record today's check-out timestamp.
11. **`get_attendance_records`**: Retrieve daily attendance logs and punctuality details.
12. **`search_employees`**: Search company directory. (Salaries automatically masked for non-staff).
13. **`get_departments`**: List active departments.
14. **`get_notices`**: Retrieve active announcements.
15. **`post_notice`**: Publish an announcement (HR/Admin only).

