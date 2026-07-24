import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local disabled to match local server namespace
/*
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
*/

import connectDB from '../lib/mongodb';
import Project from '../models/Project';
import Task from '../models/Task';

async function runTest() {
  try {
    console.log('Connecting to database...');
    await connectDB();



    // 1. Find any project and link it to test repo
    let project = await Project.findOne();
    if (!project) {
      console.log('No project found. Seeding dummy project "Intervia" (6a60b616deef6e77b5da36e7) for test context...');
      project = await Project.create({
        _id: new mongoose.Types.ObjectId("6a60b616deef6e77b5da36e7"),
        projectNumber: "PRJ26070001",
        name: "Intervia",
        description: "Seeded test project context",
        status: "active",
        priority: "medium",
        companyId: new mongoose.Types.ObjectId("69da7042692690f1815cb0c1"),
        managerId: new mongoose.Types.ObjectId("69da7042692690f1815cb0c2"),
        createdBy: new mongoose.Types.ObjectId("69da7042692690f1815cb0c2")
      });
      console.log('Dummy project seeded!');
    }

    project.githubRepo = 'test-owner/test-repo';
    await project.save();
    console.log(`Successfully linked project "${project.name}" to "test-owner/test-repo"`);

    const rawProject = await mongoose.connection.db!.collection('projects').findOne({ _id: project._id });
    console.log("Raw Project in DB after save:", rawProject);

    // 2. Find a task under this project and reset its status to to_do
    const task = await Task.findOne({ projectId: project._id });
    if (!task) {
      console.error(`No tasks found under project "${project.name}"`);
      process.exit(1);
    }

    task.status = 'to_do';
    await task.save();
    console.log(`Reset task ${task.taskNumber} status to 'to_do'`);

    // 3. Issue simulated GitHub Webhook POST event
    const webhookUrl = 'http://localhost:3000/api/webhooks/github';
    console.log(`Sending mock branch creation request to ${webhookUrl}...`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'create'
      },
      body: JSON.stringify({
        ref: `feature/${task.taskNumber}-github-connector`,
        ref_type: 'branch',
        repository: {
          full_name: 'test-owner/test-repo'
        }
      })
    });

    const responseData = await response.json();
    console.log('Webhook Response Status:', response.status);
    console.log('Webhook Response Data:', responseData);

    // 4. Verify database status change
    const updatedTask = await Task.findById(task._id);
    console.log(`Verification: Current status of ${task.taskNumber} is now: "${updatedTask?.status}"`);

    if (updatedTask && updatedTask.status === 'in_progress') {
      console.log('SUCCESS: Task automatically transitioned to in_progress!');
    } else {
      console.error('FAILURE: Task did not transition.');
    }

  } catch (error: any) {
    console.error('Test execution failed:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTest();
