import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedWebatlasRetention() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const Company = (await import('../models/Company')).default;
  const User = (await import('../models/User')).default;
  const Employee = (await import('../models/Employee')).default;
  const Department = (await import('../models/Department')).default;
  const Attendance = (await import('../models/Attendance')).default;
  const Project = (await import('../models/Project')).default;
  const Task = (await import('../models/Task')).default;
  const PerformanceAnalysis = (await import('../models/PerformanceAnalysis')).default;
  const RetentionPrediction = (await import('../models/RetentionPrediction')).default;
  const RetentionAlert = (await import('../models/RetentionAlert')).default;

  const webatlas = await Company.findOne({ name: /webatlas/i });
  if (!webatlas) {
    console.error('Webatlas company not found in database.');
    process.exit(1);
  }

  const companyId = webatlas._id;
  console.log(`Found Webatlas Company ID: ${companyId}`);

  // 1. Ensure Standard Departments exist
  const deptNames = ['Engineering', 'Product & Design', 'Quality Assurance', 'Management', 'Operations'];
  for (const deptName of deptNames) {
    const existingDept = await Department.findOne({ companyId, name: deptName });
    if (!existingDept) {
      await Department.create({
        companyId,
        name: deptName,
        description: `${deptName} Division at Webatlas`,
        isActive: true,
      });
      console.log(`Created department: ${deptName}`);
    }
  }

  // 2. Fetch all Webatlas Users
  const users = await User.find({ companyId });
  console.log(`Found ${users.length} users in Webatlas.`);

  // 3. Populate Employee Profile Records
  const roleSalaries: Record<string, number> = {
    'CEO': 220000,
    'CTO & Co-founder': 200000,
    'Software Developer': 85000,
    'React Native Developer': 90000,
    'Quality Analyst': 65000,
    'Intern Software Developer': 30000,
    'Application for Software Engineer': 70000,
  };

  const joiningDates: Record<string, number> = {
    'Tarun': 36, // 36 months
    'Sunil Singh': 36,
    'Anirudh Bhardwaj': 20, // 20 months
    'Akash Thakur': 16,
    'John': 14,
    'Ayush Sen': 10,
    'Aparna Sharma': 8,
    'Deepak Rana': 4,
    'Mr Ayush': 3,
    'Sharu Bogal': 3,
  };

  let empIndex = 1;
  for (const user of users) {
    const nameParts = (user.name || 'Team Member').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Webatlas';
    const designation = user.designation || 'Software Engineer';
    const department = user.department || 'Engineering';

    const monthsAgo = joiningDates[user.name] || (empIndex * 3 + 2);
    const joiningDate = new Date();
    joiningDate.setMonth(joiningDate.getMonth() - monthsAgo);

    const salary = roleSalaries[designation] || 75000;
    const empCode = `WA-${String(empIndex).padStart(3, '0')}`;

    await Employee.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        companyId,
        employeeId: empCode,
        firstName,
        lastName,
        department,
        designation,
        joiningDate,
        salary,
        contactNumber: '+91 98765 ' + String(10000 + empIndex * 111),
        address: {
          street: 'Phase 8B, Industrial Area',
          city: 'Mohali',
          state: 'Punjab',
          zip: '160071',
          country: 'India',
        },
      },
      { upsert: true, new: true }
    );
    empIndex++;
  }
  console.log('Synchronized Employee profile collection.');

  // 4. Generate 60 Days of Attendance Records
  console.log('Generating 60 days of attendance history...');
  await Attendance.deleteMany({ companyId });

  const attendancesToInsert: any[] = [];
  const today = new Date();

  for (let d = 60; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    
    // Skip Sunday
    if (date.getDay() === 0) continue;

    for (const user of users) {
      let isLate = false;
      let lateMinutes = 0;
      let status = 'Present';
      let totalHours = 8.5;
      let checkInTime = '09:00';
      let checkOutTime = '18:00';

      // Persona 1: Stellar Performer (Anirudh Bhardwaj, Sunil Singh, Tarun)
      if (user.name === 'Anirudh Bhardwaj' || user.name === 'Sunil Singh' || user.name === 'Tarun') {
        const jitter = Math.floor(Math.random() * 8);
        checkInTime = `08:5${jitter}`;
        totalHours = 8.8 + (Math.random() * 0.4);
        isLate = false;
      }
      // Persona 2: Burnout / Overworked (Deepak Rana) -> 10.5+ hrs daily
      else if (user.name === 'Deepak Rana') {
        checkInTime = '09:05';
        totalHours = 10.5 + (Math.random() * 0.8);
        checkOutTime = '20:30';
        isLate = Math.random() > 0.7;
        lateMinutes = isLate ? 15 : 0;
      }
      // Persona 3: Rising Disengagement (Mr Ayush, John) -> more lates in recent 14 days
      else if (user.name === 'Mr Ayush' || user.name === 'John') {
        if (d < 14) {
          // Recent lates
          isLate = Math.random() > 0.4;
          lateMinutes = isLate ? 25 + Math.floor(Math.random() * 30) : 0;
          checkInTime = isLate ? `09:${lateMinutes}` : '09:02';
          totalHours = 7.5 + (Math.random() * 0.5);
          if (d === 3 || d === 10) {
            status = 'Absent';
            totalHours = 0;
          }
        } else {
          isLate = Math.random() > 0.8;
          lateMinutes = isLate ? 10 : 0;
        }
      }
      // Persona 4: Normal consistent team members
      else {
        isLate = Math.random() > 0.85;
        lateMinutes = isLate ? 12 + Math.floor(Math.random() * 15) : 0;
        checkInTime = isLate ? `09:${String(lateMinutes).padStart(2, '0')}` : '09:00';
        totalHours = 8.2 + (Math.random() * 0.6);
      }

      if (status !== 'Absent') {
        attendancesToInsert.push({
          employeeId: user._id,
          companyId,
          date,
          checkIn: { time: checkInTime, ip: '127.0.0.1' },
          checkOut: { time: checkOutTime, ip: '127.0.0.1' },
          totalHours: Math.round(totalHours * 10) / 10,
          status: isLate ? 'Late' : 'Present',
          isLate,
          lateMinutes,
          shiftStartTime: '09:00',
          shiftEndTime: '18:00',
        });
      }
    }
  }

  await Attendance.insertMany(attendancesToInsert);
  console.log(`Inserted ${attendancesToInsert.length} attendance records.`);

  // 5. Generate Projects & Tasks
  console.log('Generating active projects and task workloads...');
  await Project.deleteMany({ companyId });
  await Task.deleteMany({ companyId });

  const adminUser = users.find(u => u.role === 'admin') || users[0];

  const project1: any = await Project.create({
    companyId,
    projectNumber: 'PRJ-101',
    name: 'NexusHR AI Multi-Tenant Core',
    description: 'Autonomous AI HR analytics, retention prediction, and predictive intelligence.',
    status: 'active',
    priority: 'critical',
    managerId: adminUser._id,
    createdBy: adminUser._id,
    startDate: new Date(Date.now() - 60 * 86400000),
    endDate: new Date(Date.now() + 45 * 86400000),
    members: users.slice(0, 6).map(u => ({
      employeeId: u._id,
      role: u.role === 'admin' ? 'project_manager' : 'developer',
      joinedAt: new Date(),
      allocationPercentage: 80,
    })),
  });

  const project2: any = await Project.create({
    companyId,
    projectNumber: 'PRJ-102',
    name: 'Webatlas Enterprise Mobile Suite',
    description: 'React Native high-performance client portal with real-time biometric verification.',
    status: 'active',
    priority: 'high',
    managerId: adminUser._id,
    createdBy: adminUser._id,
    startDate: new Date(Date.now() - 30 * 86400000),
    endDate: new Date(Date.now() + 60 * 86400000),
    members: users.slice(4).map(u => ({
      employeeId: u._id,
      role: 'developer',
      joinedAt: new Date(),
      allocationPercentage: 90,
    })),
  });

  const taskList = [
    { title: 'Implement Retention Risk Predictive Algorithms', status: 'completed', assignedUser: 'Anirudh Bhardwaj', points: 8 },
    { title: 'Real-time WebSocket Multi-Tenant Gateway', status: 'completed', assignedUser: 'Sunil Singh', points: 13 },
    { title: 'React Native Offline Biometrics Cache', status: 'in_progress', assignedUser: 'John', points: 5 },
    { title: 'Automated Attendance Geo-Fencing Regression Tests', status: 'completed', assignedUser: 'Aparna Sharma', points: 5 },
    { title: 'MongoDB Indexing & Sharding Strategy', status: 'in_progress', assignedUser: 'Akash Thakur', points: 8 },
    { title: 'NVIDIA NIM Llama-3.1 Evaluation Engine', status: 'completed', assignedUser: 'Anirudh Bhardwaj', points: 8 },
    { title: 'Overtime Workload & Burnout Alert Monitor', status: 'in_progress', assignedUser: 'Deepak Rana', points: 5 },
    { title: 'Refactor Candidate Portal Login Flow', status: 'in_review', assignedUser: 'Ayush Sen', points: 3 },
    { title: 'Fix Android APK Build Script & Proguard', status: 'to_do', assignedUser: 'Mr Ayush', points: 5 },
    { title: 'Weekly Sprint Retrospective & QA Validation', status: 'in_progress', assignedUser: 'Aparna Sharma', points: 3 },
  ];

  let taskNum = 1;
  for (const t of taskList) {
    const assigned = users.find(u => u.name === t.assignedUser) || users[0];
    await Task.create({
      companyId,
      taskNumber: `TSK-${taskNum++}`,
      title: t.title,
      description: `Detailed execution of ${t.title} for Webatlas engineering sprints.`,
      status: t.status,
      priority: 'high',
      taskType: 'story',
      projectId: project1._id,
      assignedTo: [assigned._id],
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 7 * 86400000),
      estimatedHours: t.points * 2,
      actualHours: t.status === 'completed' ? t.points * 2 : t.points,
      progressPercentage: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 60 : 0,
      storyPoints: t.points,
    });
  }
  console.log(`Seeded ${taskList.length} tasks and 2 active projects.`);

  // 6. Generate Performance Reviews (PerformanceAnalysis)
  console.log('Generating AI Performance Analyses...');
  await PerformanceAnalysis.deleteMany({ companyId });

  for (const user of users) {
    let rating = 8.2;
    let summary = 'Consistently delivers high-quality features with strong technical precision.';
    let merits = ['Exceptional code quality', 'Proactive problem solving', 'Great team collaborator'];
    let demerits = ['None noted'];

    if (user.name === 'Anirudh Bhardwaj') {
      rating = 9.4;
      summary = 'Outstanding architecture leadership, delivers mission-critical systems ahead of schedule.';
      merits = ['Architectural mastery', 'Speed and accuracy', 'High code reliability'];
    } else if (user.name === 'Deepak Rana') {
      rating = 7.2;
      summary = 'High output but showing signs of workload strain due to excessive overtime hours.';
      demerits = ['At risk of burnout', 'High overtime fatigue'];
    } else if (user.name === 'Mr Ayush') {
      rating = 6.0;
      summary = 'Needs guidance on punctuality and sprint task focus.';
      demerits = ['Inconsistent attendance', 'Needs closer mentorship'];
    }

    await PerformanceAnalysis.create({
      employeeId: user._id,
      companyId,
      date: new Date(Date.now() - 5 * 86400000),
      rating,
      summary,
      merits,
      demerits,
      suggestions: ['Maintain current cadence and mentor junior engineers.'],
      metrics: {
        lateMinutes: 0,
        totalHours: 40,
        overtimeHours: 4,
        onTimeCheckIn: true,
      },
    });
  }

  // 7. Run Company Retention Predictions
  console.log('Running Retention Prediction Engine across all Webatlas employees...');
  const { runCompanyRetentionPredictions } = await import('../lib/retention/predictor');
  const result = await runCompanyRetentionPredictions(companyId.toString());
  console.log('Prediction calculation finished:', result);

  const predictionsCount = await RetentionPrediction.countDocuments({ companyId });
  const alertsCount = await RetentionAlert.countDocuments({ companyId });
  console.log(`Generated ${predictionsCount} retention predictions and ${alertsCount} active retention alerts!`);

  await mongoose.disconnect();
  console.log('Seeding completed successfully!');
}

seedWebatlasRetention().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
