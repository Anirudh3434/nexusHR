// End-to-end API Route Test Script
// Run with: npx tsx scripts/test-api-e2e.ts

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Project from '../models/Project';
import User from '../models/User';
import Company from '../models/Company';
import axios from 'axios';

async function testE2E() {
  const companyId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const memberEmployeeId = new mongoose.Types.ObjectId();
  const nonMemberEmployeeId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();

  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected.');

    // 1. Create test Company
    const testCompany = await Company.create({
      _id: companyId,
      name: 'Test Verify Company',
      code: 'TVC',
      email: 'test@tvc.com',
      isActive: true,
      onboardingComplete: true,
      officeLocation: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    });
    console.log('Created test company.');

    // 2. Create test Users
    const adminUser = await User.create({
      _id: adminId,
      name: 'Test Admin',
      email: 'admin@tvc.com',
      password: 'password123',
      role: 'admin',
      companyId: companyId,
      status: 'Active'
    });

    const memberEmployee = await User.create({
      _id: memberEmployeeId,
      name: 'Test Member',
      email: 'member@tvc.com',
      password: 'password123',
      role: 'employee',
      companyId: companyId,
      status: 'Active'
    });

    const nonMemberEmployee = await User.create({
      _id: nonMemberEmployeeId,
      name: 'Test NonMember',
      email: 'nonmember@tvc.com',
      password: 'password123',
      role: 'employee',
      companyId: companyId,
      status: 'Active'
    });
    console.log('Created test users.');

    // 3. Create test Project
    const testProject = await Project.create({
      _id: projectId,
      projectNumber: 'PRJ9999',
      name: 'E2E Testing Project',
      description: 'A project for verification',
      status: 'active',
      priority: 'high',
      companyId: companyId,
      managerId: adminId,
      members: [
        {
          employeeId: memberEmployeeId,
          role: 'developer',
          joinedAt: new Date(),
          allocationPercentage: 100
        }
      ],
      createdBy: adminId,
      progressPercentage: 0
    });
    console.log(`Created test project with ID: ${projectId}`);

    const url = `http://localhost:3000/api/projects/${projectId}`;

    // Test Case 1: Unauthorized (no headers)
    console.log('\n--- Test Case 1: Unauthorized (No Headers) ---');
    try {
      await axios.get(url);
      console.error('FAIL: Expected 401 but request succeeded.');
    } catch (err: any) {
      console.log(`Status: ${err.response?.status}`);
      console.log(`Message: ${JSON.stringify(err.response?.data)}`);
      if (err.response?.status === 401) {
        console.log('SUCCESS: Correctly returned 401 Unauthorized.');
      } else {
        console.error('FAIL: Unexpected status.');
      }
    }

    // Test Case 2: Admin Access (should succeed)
    console.log('\n--- Test Case 2: Admin Access ---');
    try {
      const res = await axios.get(url, {
        headers: {
          'x-user-id': adminId.toString(),
          'x-user-role': 'admin',
          'x-company-id': companyId.toString()
        }
      });
      console.log(`Status: ${res.status}`);
      console.log(`Project Name: ${res.data.project?.name}`);
      if (res.status === 200 && res.data.project?.name === 'E2E Testing Project') {
        console.log('SUCCESS: Admin successfully retrieved project.');
      } else {
        console.error('FAIL: Unexpected response.');
      }
    } catch (err: any) {
      console.error('FAIL: Request failed:', err.response?.data || err.message);
    }

    // Test Case 3: Member Employee Access (should succeed)
    console.log('\n--- Test Case 3: Member Employee Access ---');
    try {
      const res = await axios.get(url, {
        headers: {
          'x-user-id': memberEmployeeId.toString(),
          'x-user-role': 'employee',
          'x-company-id': companyId.toString()
        }
      });
      console.log(`Status: ${res.status}`);
      console.log(`Project Name: ${res.data.project?.name}`);
      if (res.status === 200 && res.data.project?.name === 'E2E Testing Project') {
        console.log('SUCCESS: Member Employee successfully retrieved project.');
      } else {
        console.error('FAIL: Unexpected response.');
      }
    } catch (err: any) {
      console.error('FAIL: Request failed:', err.response?.data || err.message);
    }

    // Test Case 4: Non-Member Employee Access (should be 403 Forbidden)
    console.log('\n--- Test Case 4: Non-Member Employee Access ---');
    try {
      await axios.get(url, {
        headers: {
          'x-user-id': nonMemberEmployeeId.toString(),
          'x-user-role': 'employee',
          'x-company-id': companyId.toString()
        }
      });
      console.error('FAIL: Expected 403 but request succeeded.');
    } catch (err: any) {
      console.log(`Status: ${err.response?.status}`);
      console.log(`Message: ${JSON.stringify(err.response?.data)}`);
      if (err.response?.status === 403) {
        console.log('SUCCESS: Non-member employee was correctly forbidden.');
      } else {
        console.error('FAIL: Unexpected status.');
      }
    }

    // Test Case 5: Different Company Access (should be 403 Forbidden)
    console.log('\n--- Test Case 5: Different Company Access ---');
    const diffCompanyId = new mongoose.Types.ObjectId();
    try {
      await axios.get(url, {
        headers: {
          'x-user-id': adminId.toString(),
          'x-user-role': 'admin',
          'x-company-id': diffCompanyId.toString()
        }
      });
      console.error('FAIL: Expected 403 but request succeeded.');
    } catch (err: any) {
      console.log(`Status: ${err.response?.status}`);
      console.log(`Message: ${JSON.stringify(err.response?.data)}`);
      if (err.response?.status === 403) {
        console.log('SUCCESS: Access from different company was correctly forbidden.');
      } else {
        console.error('FAIL: Unexpected status.');
      }
    }

  } catch (error) {
    console.error('E2E Test Execution Error:', error);
  } finally {
    // Cleanup
    console.log('\nCleaning up test documents...');
    await Project.deleteOne({ _id: projectId });
    await User.deleteMany({ _id: { $in: [adminId, memberEmployeeId, nonMemberEmployeeId] } });
    await Company.deleteOne({ _id: companyId });
    console.log('Cleanup completed.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

testE2E();
