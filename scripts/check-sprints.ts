import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Sprint from '../models/Sprint';
import Task from '../models/Task';

// Load .env.local
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

async function check() {
  await connectDB();
  const sprints = await Sprint.find({}).lean();
  console.log('ALL Sprints in DB:', JSON.stringify(sprints, null, 2));
  
  const tasks = await Task.find({}).lean();
  console.log('ALL Tasks in DB:', tasks.map((t: any) => ({ 
    taskNumber: t.taskNumber, 
    title: t.title, 
    projectId: t.projectId, 
    companyId: t.companyId,
    sprintId: t.sprintId,
    status: t.status
  })));
  
  process.exit(0);
}

check();
