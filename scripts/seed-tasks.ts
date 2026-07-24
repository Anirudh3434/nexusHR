import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local BEFORE importing connectDB or other Mongoose models
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const PROJECT_ID_STR = "6a60b616deef6e77b5da36e7";
const COMPANY_ID_STR = "69da7042692690f1815cb0c1";
const SPRINT_ID_STR = "6a60b64ddeef6e77b5da37b0";
const TARUN_ID_STR = "69da7042692690f1815cb0c2";

async function run() {
  const mongoose = (await import('mongoose')).default;
  const connectDB = (await import('../lib/mongodb')).default;
  const Task = (await import('../models/Task')).default;
  const ActivityLog = (await import('../models/ActivityLog')).default;

  const PROJECT_ID = new mongoose.Types.ObjectId(PROJECT_ID_STR);
  const COMPANY_ID = new mongoose.Types.ObjectId(COMPANY_ID_STR);
  const SPRINT_ID = new mongoose.Types.ObjectId(SPRINT_ID_STR);
  const TARUN_ID = new mongoose.Types.ObjectId(TARUN_ID_STR);

  const SEED_TASKS = [
    {
      title: "Implement OAuth backend flows",
      description: "Connect standard Google/GitHub OAuth sign-in API.",
      status: "in_progress",
      priority: "high",
      taskType: "task",
      taskNumber: "TSK26070010",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_oauth", name: "OAuth", color: "#3B82F6" }],
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 2),
      progressPercentage: 20,
      createdBy: TARUN_ID
    },
    {
      title: "Write e2e test scripts for board",
      description: "Verify filters and list task components using Playwright.",
      status: "in_review",
      priority: "medium",
      taskType: "task",
      taskNumber: "TSK26070011",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_testing", name: "Testing", color: "#10B981" }],
      createdAt: new Date(),
      dueDate: new Date(),
      progressPercentage: 60,
      createdBy: TARUN_ID
    },
    {
      title: "Fix button alignment on navigation bar",
      description: "Buttons are wrapping on smaller device breakpoints.",
      status: "to_do",
      priority: "low",
      taskType: "bug",
      taskNumber: "TSK26070012",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ui", name: "UI", color: "#EF4444" }],
      createdAt: new Date(),
      progressPercentage: 0,
      createdBy: TARUN_ID
    },
    {
      title: "Support NVIDIA NIM API integration",
      description: "Ensure sentence-to-query API successfully uses the key.",
      status: "completed",
      priority: "critical",
      taskType: "task",
      taskNumber: "TSK26070013",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ai", name: "AI", color: "#8B5CF6" }],
      createdAt: new Date(),
      completedAt: new Date(),
      progressPercentage: 100,
      createdBy: TARUN_ID
    },
    {
      title: "Epic: Dashboard Analytics Upgrade",
      description: "Add charts, attendance analytics, and performance logs.",
      status: "in_progress",
      priority: "medium",
      taskType: "epic",
      taskNumber: "TSK26070014",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      createdAt: new Date(),
      progressPercentage: 40,
      createdBy: TARUN_ID
    },
    {
      title: "Configure SSL certificates for domain",
      description: "Setup HTTPS and automate cert renewals using Let's Encrypt.",
      status: "completed",
      priority: "high",
      taskType: "task",
      taskNumber: "TSK26070015",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_security", name: "Security", color: "#EF4444" }],
      createdAt: new Date(),
      progressPercentage: 100,
      createdBy: TARUN_ID
    },
    {
      title: "Integrate Sendgrid email notification service",
      description: "Deliver transactional messages on status changes and comments.",
      status: "in_progress",
      priority: "medium",
      taskType: "task",
      taskNumber: "TSK26070016",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_backend", name: "Backend", color: "#8B5CF6" }],
      createdAt: new Date(),
      progressPercentage: 15,
      createdBy: TARUN_ID
    },
    {
      title: "Bug: Page crash on empty search query input",
      description: "Search filter fails with null pointer when query has special chars.",
      status: "to_do",
      priority: "critical",
      taskType: "bug",
      taskNumber: "TSK26070017",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_testing", name: "Testing", color: "#10B981" }],
      createdAt: new Date(),
      progressPercentage: 0,
      createdBy: TARUN_ID
    },
    {
      title: "Design new dark mode visual theme",
      description: "Apply CSS HSL parameters for sleek, futuristic dark-mode styling.",
      status: "to_do",
      priority: "low",
      taskType: "story",
      taskNumber: "TSK26070018",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ui", name: "UI", color: "#EC4899" }],
      createdAt: new Date(),
      progressPercentage: 0,
      createdBy: TARUN_ID
    },
    {
      title: "Implement database index for taskNumber",
      description: "Speeds up lookups on task retrieval APIs.",
      status: "completed",
      priority: "medium",
      taskType: "task",
      taskNumber: "TSK26070019",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_database", name: "Database", color: "#F59E0B" }],
      createdAt: new Date(),
      progressPercentage: 100,
      createdBy: TARUN_ID
    },
    {
      title: "Optimize bundle sizes with code splitting",
      description: "Reduce Next.js initial bundle size below 200kb.",
      status: "in_review",
      priority: "medium",
      taskType: "improvement",
      taskNumber: "TSK26070020",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ui", name: "UI", color: "#EC4899" }],
      createdAt: new Date(),
      progressPercentage: 90,
      createdBy: TARUN_ID
    },
    {
      title: "Write security penetration testing report",
      description: "Verify XSS vulnerabilities across comment inputs.",
      status: "in_progress",
      priority: "high",
      taskType: "task",
      taskNumber: "TSK26070021",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_security", name: "Security", color: "#EF4444" }],
      createdAt: new Date(),
      progressPercentage: 45,
      createdBy: TARUN_ID
    },
    {
      title: "Fix memory leak in web sockets connection",
      description: "Close connections cleanly on sidebar component unmount.",
      status: "to_do",
      priority: "critical",
      taskType: "bug",
      taskNumber: "TSK26070022",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_testing", name: "Testing", color: "#10B981" }],
      createdAt: new Date(),
      progressPercentage: 0,
      createdBy: TARUN_ID
    },
    {
      title: "Add storybook configuration for component library",
      description: "Document core UI components in isolation.",
      status: "to_do",
      priority: "low",
      taskType: "task",
      taskNumber: "TSK26070023",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ui", name: "UI", color: "#EC4899" }],
      createdAt: new Date(),
      progressPercentage: 0,
      createdBy: TARUN_ID
    },
    {
      title: "Create user profile avatar edit options",
      description: "Support image upload to Cloudinary directly from profile screen.",
      status: "completed",
      priority: "low",
      taskType: "story",
      taskNumber: "TSK26070024",
      projectId: PROJECT_ID,
      assignedTo: [TARUN_ID],
      assignedBy: TARUN_ID,
      companyId: COMPANY_ID,
      sprintId: SPRINT_ID,
      labels: [{ _id: "label_ui", name: "UI", color: "#EC4899" }],
      createdAt: new Date(),
      progressPercentage: 100,
      createdBy: TARUN_ID
    }
  ];

  const SEED_LOGS = [
    {
      projectId: PROJECT_ID,
      companyId: COMPANY_ID,
      userId: TARUN_ID,
      userName: "Tarun",
      actionType: "custom_status_changed",
      fieldName: "status",
      newValue: "qa",
      createdAt: new Date(Date.now() - 3600000 * 2)
    },
    {
      projectId: PROJECT_ID,
      companyId: COMPANY_ID,
      userId: TARUN_ID,
      userName: "Tarun",
      actionType: "custom_status_changed",
      fieldName: "status",
      newValue: "stage",
      createdAt: new Date(Date.now() - 3600000)
    }
  ];

  try {
    console.log('Connecting to MongoDB:', process.env.MONGODB_URI ? 'Atlas' : 'Local');
    await connectDB();
    console.log('Connected.');

    // Clear existing seeded tasks
    const taskNumbers = SEED_TASKS.map(t => t.taskNumber);
    await Task.deleteMany({ taskNumber: { $in: taskNumbers } });
    console.log('Cleared existing seeded tasks.');

    // Fetch all users in the company to distribute assignees
    const User = (await import('../models/User')).default;
    const companyUsers = await User.find({ companyId: COMPANY_ID }).lean();
    console.log(`Found ${companyUsers.length} company users for dynamic assignment.`);

    const tasksWithAssignees = SEED_TASKS.map((task, index) => {
      const assigneeList: mongoose.Types.ObjectId[] = [];
      if (companyUsers.length > 0) {
        const primaryUser = companyUsers[index % companyUsers.length];
        assigneeList.push(primaryUser._id);
        if (companyUsers.length > 1 && index % 3 === 0) {
          const secondaryUser = companyUsers[(index + 1) % companyUsers.length];
          assigneeList.push(secondaryUser._id);
        }
      } else {
        assigneeList.push(TARUN_ID);
      }

      const creatorId = companyUsers.length > 0 
        ? companyUsers[(index + 2) % companyUsers.length]._id 
        : TARUN_ID;

      return {
        ...task,
        assignedTo: assigneeList,
        assignedBy: creatorId,
        createdBy: creatorId
      };
    });

    // Seed tasks
    const insertedTasks = await Task.insertMany(tasksWithAssignees);
    console.log(`Inserted ${insertedTasks.length} tasks.`);

    // Attach task references to Activity Logs
    const logsToInsert = SEED_LOGS.map((log, index) => {
      const taskId = insertedTasks[index % insertedTasks.length]._id;
      return {
        ...log,
        taskId
      };
    });

    const insertedLogs = await ActivityLog.insertMany(logsToInsert);
    console.log(`Inserted ${insertedLogs.length} activity logs.`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

run();
