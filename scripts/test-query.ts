// Script to check a project in MongoDB
// Run with: npx ts-node scripts/test-query.ts or npx tsx scripts/test-query.ts

import mongoose from 'mongoose';
import Project from '../models/Project';
import connectDB from '../lib/mongodb';

async function testQuery() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected!\n');

    const projectId = "6a512507f794ad347786a29c";
    const project = await Project.findById(projectId)
      .populate('managerId', 'name email department')
      .populate('members.employeeId', 'name email department')
      .populate('createdBy', 'name email');

    if (!project) {
      console.log(`Project with ID ${projectId} not found.`);
      const anyProject = await Project.findOne();
      if (anyProject) {
        console.log(`Found another project instead: ID=${anyProject._id}, Name="${anyProject.name}"`);
      } else {
        console.log("No projects exist in the database.");
      }
    } else {
      console.log("Successfully found and populated project:", JSON.stringify(project, null, 2));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();
