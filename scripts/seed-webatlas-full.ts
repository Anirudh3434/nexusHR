import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

async function seedWebatlas() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const Leave = mongoose.model('Leave', new mongoose.Schema({}, { strict: false }));
  const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

  // 1. Get or Create Webatlas Company
  const companyIdStr = "69da7042692690f1815cb0c1";
  let company = await Company.findById(companyIdStr).lean() as any;
  if (!company) {
    company = await Company.findOne({ name: /webatlas/i }).lean() as any;
  }
  if (!company) {
    company = await Company.create({
      _id: new mongoose.Types.ObjectId(companyIdStr),
      name: 'Webatlas',
      code: '8340234',
      email: 'admin@webatlas.tech',
      officeLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Webatlas Tech Hub' },
      geoFenceRadius: 500,
      enableGeoFencing: true,
      isActive: true
    }) as any;
  }
  const companyId = company._id;
  console.log('Using Company:', company.name, 'ID:', companyId);

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Setup Anirudh Bhardwaj
  const anirudh = await User.findOneAndUpdate(
    { name: /Anirudh Bhardwaj/i, companyId },
    {
      $set: {
        name: 'Anirudh Bhardwaj',
        email: 'anirudh@webatlas.tech',
        password: hashedPassword,
        role: 'employee',
        employeeId: '025',
        designation: 'Software Developer',
        department: 'Engineering',
        dob: new Date('1998-05-14'),
        joiningDate: new Date('2023-01-15'),
        isActive: true,
        companyId
      }
    },
    { upsert: true, new: true }
  ) as any;
  console.log('Updated User Anirudh:', anirudh._id, anirudh.name, anirudh.employeeId);

  // 3. Colleagues & Birthdays matching screenshot
  const colleaguesData = [
    {
      name: 'Sunil Singh',
      email: 'sunil.singh@webatlas.tech',
      designation: 'CTO & Co-founder',
      department: 'Executive',
      employeeId: '002',
      dob: new Date('1986-09-07'), // 07 Sep
      role: 'admin'
    },
    {
      name: 'Mr Ayush',
      email: 'ayush.intern@webatlas.tech',
      designation: 'Intern Software Developer',
      department: 'Engineering',
      employeeId: '041',
      dob: new Date('2002-09-16'), // 16 Sep
      role: 'employee'
    },
    {
      name: 'Deepak Rana',
      email: 'deepak.rana@webatlas.tech',
      designation: 'Intern Software Developer',
      department: 'Engineering',
      employeeId: '042',
      dob: new Date('2001-09-23'), // 23 Sep
      role: 'employee'
    },
    {
      name: 'Aparna Sharma',
      email: 'aparna.sharma@webatlas.tech',
      designation: 'Quality Analyst',
      department: 'QA',
      employeeId: '018',
      dob: new Date('1997-10-06'), // 06 Oct
      role: 'employee'
    },
    {
      name: 'Sharu Bogal',
      email: 'sharu.bogal@webatlas.tech',
      designation: 'Intern Software Developer',
      department: 'Engineering',
      employeeId: '043',
      dob: new Date('2002-10-30'), // 30 Oct
      role: 'employee'
    },
    {
      name: 'Ayush Sen',
      email: 'ayush.sen@webatlas.tech',
      designation: 'Software Developer',
      department: 'Engineering',
      employeeId: '026',
      dob: new Date('2000-08-25'),
      role: 'employee'
    }
  ];

  const createdColleagues: any[] = [];
  for (const c of colleaguesData) {
    const colUser = await User.findOneAndUpdate(
      { email: c.email },
      {
        $set: {
          name: c.name,
          email: c.email,
          password: hashedPassword,
          designation: c.designation,
          department: c.department,
          employeeId: c.employeeId,
          dob: c.dob,
          role: c.role,
          companyId,
          isActive: true
        }
      },
      { upsert: true, new: true }
    ) as any;
    createdColleagues.push(colUser);
    console.log(`Colleague ready: ${colUser.name} (${c.designation})`);
  }

  const ayushSen = createdColleagues.find(c => c.name === 'Ayush Sen');

  // 4. Leave Records for "On Leave Today" and "My Calendar"
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const endToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);

  // Clear existing leaves for Ayush & Anirudh in Webatlas to prevent duplicates
  await Leave.deleteMany({ companyId, employeeId: { $in: [ayushSen._id, anirudh._id] } });

  await Leave.create({
    employeeId: ayushSen._id,
    companyId,
    type: 'Casual',
    startDate: startToday,
    endDate: endToday,
    totalDays: 4,
    reason: 'Family Vacation',
    status: 'Approved'
  });

  await Leave.create({
    employeeId: anirudh._id,
    companyId,
    type: 'Annual',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
    totalDays: 2,
    reason: 'Planned Conference Leave',
    status: 'Approved'
  });
  console.log('Created active leave records for Ayush Sen & Anirudh');

  // Find or Create Akash Thakur
  const akashThakur = await User.findOneAndUpdate(
    { email: 'akash.webatlas@gmail.com' },
    {
      $set: {
        name: 'Akash Thakur',
        email: 'akash.webatlas@gmail.com',
        password: hashedPassword,
        designation: 'Software Developer',
        department: 'Engineering',
        employeeId: '028',
        dob: new Date('1999-07-20'),
        role: 'employee',
        companyId,
        isActive: true
      }
    },
    { upsert: true, new: true }
  ) as any;

  const sunilSingh = createdColleagues.find(c => c.name === 'Sunil Singh') || createdColleagues[0];

  // 5. Projects
  await Project.deleteMany({ companyId });
  const projectsData = [
    {
      name: 'Mobile App Revamp',
      projectNumber: 'PRJ-101',
      description: 'iOS & Android mobile native experience overhaul',
      status: 'active',
      priority: 'high',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      managerId: sunilSingh._id,
      companyId,
      progressPercentage: 65,
      budget: 25000,
      currency: 'USD',
      members: [
        { employeeId: anirudh._id, role: 'developer', allocationPercentage: 100 },
        { employeeId: ayushSen._id, role: 'developer', allocationPercentage: 100 },
        { employeeId: akashThakur._id, role: 'developer', allocationPercentage: 100 }
      ]
    },
    {
      name: 'NexusHR Core Platform',
      projectNumber: 'PRJ-102',
      description: 'Enterprise HRM platform enhancements and real-time syncing',
      status: 'active',
      priority: 'critical',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-11-30'),
      managerId: sunilSingh._id,
      companyId,
      progressPercentage: 45,
      budget: 50000,
      currency: 'USD',
      members: [
        { employeeId: anirudh._id, role: 'developer', allocationPercentage: 100 },
        { employeeId: akashThakur._id, role: 'developer', allocationPercentage: 100 }
      ]
    },
    {
      name: 'DevOps & Cloud Infra',
      projectNumber: 'PRJ-103',
      description: 'Kubernetes cluster and CI/CD pipelines',
      status: 'active',
      priority: 'medium',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-10-31'),
      managerId: sunilSingh._id,
      companyId,
      progressPercentage: 80,
      budget: 15000,
      currency: 'USD',
      members: [
        { employeeId: anirudh._id, role: 'developer', allocationPercentage: 100 },
        { employeeId: akashThakur._id, role: 'developer', allocationPercentage: 100 }
      ]
    },
    {
      name: 'AI Agent & Recruitment Suite',
      projectNumber: 'PRJ-104',
      description: 'Intelligent candidate ranking and briefing workflows',
      status: 'active',
      priority: 'high',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-12-15'),
      managerId: sunilSingh._id,
      companyId,
      progressPercentage: 30,
      budget: 40000,
      currency: 'USD',
      members: [
        { employeeId: anirudh._id, role: 'developer', allocationPercentage: 100 },
        { employeeId: akashThakur._id, role: 'developer', allocationPercentage: 100 }
      ]
    }
  ];

  const createdProjects = await Project.insertMany(projectsData);
  console.log('Created 4 Active Projects');

  const mainProject = createdProjects[0];

  // 6. Tasks matching reference screenshot
  await Task.deleteMany({ companyId, assignedTo: anirudh._id });

  const tasksData = [
    {
      taskNumber: 'NT-19',
      title: 'Work on the Loading screen issue + Email sup abase auth issue',
      description: 'Fix the auth redirect and spinner timeout on cold start.',
      status: 'to_do',
      priority: 'high',
      taskType: 'bug',
      projectId: mainProject._id,
      assignedTo: [anirudh._id],
      assignedBy: anirudh._id,
      companyId,
      dueDate: new Date('2026-06-11'),
      progressPercentage: 0,
      createdAt: new Date()
    },
    {
      taskNumber: 'NT-10',
      title: 'Setup the XCTest and SwiftLint',
      description: 'Add automated UI unit testing and linter rules.',
      status: 'to_do',
      priority: 'medium',
      taskType: 'task',
      projectId: mainProject._id,
      assignedTo: [anirudh._id],
      assignedBy: anirudh._id,
      companyId,
      progressPercentage: 0,
      createdAt: new Date()
    },
    {
      taskNumber: '1',
      title: 'Fix issue in the Staging distribution',
      description: 'Resolve build signing and distribution certificate issues on TestFlight.',
      status: 'in_progress',
      priority: 'high',
      taskType: 'bug',
      projectId: mainProject._id,
      assignedTo: [anirudh._id],
      assignedBy: anirudh._id,
      companyId,
      progressPercentage: 50,
      createdAt: new Date()
    }
  ];

  await Task.insertMany(tasksData);
  console.log('Created 3 Tasks matching screenshot');

  // 7. Check attendance for today
  const todayStr = new Date().toISOString().split('T')[0];
  await Attendance.findOneAndUpdate(
    { employeeId: anirudh._id, date: todayStr },
    {
      $set: {
        employeeId: anirudh._id,
        companyId,
        date: todayStr,
        status: 'Present',
        checkIn: '09:30',
        workMode: 'office'
      }
    },
    { upsert: true }
  );

  console.log('=== Webatlas Database Seeding Successfully Completed! ===');
  await mongoose.disconnect();
  process.exit(0);
}

seedWebatlas().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
