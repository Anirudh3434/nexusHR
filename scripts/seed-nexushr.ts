import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local and .env
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

async function seedNexusHR() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB successfully.\n');

  // Define models using strict: false or imported schemas
  const Company = mongoose.models.Company || mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Department = mongoose.models.Department || mongoose.model('Department', new mongoose.Schema({}, { strict: false }));
  const Designation = mongoose.models.Designation || mongoose.model('Designation', new mongoose.Schema({}, { strict: false }));
  const WorkShift = mongoose.models.WorkShift || mongoose.model('WorkShift', new mongoose.Schema({}, { strict: false }));
  const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', new mongoose.Schema({}, { strict: false }));
  const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({}, { strict: false }));
  const Project = mongoose.models.Project || mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Sprint = mongoose.models.Sprint || mongoose.model('Sprint', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const HRKnowledgeBase = mongoose.models.HRKnowledgeBase || mongoose.model('HRKnowledgeBase', new mongoose.Schema({}, { strict: false }));

  // ==========================================
  // 1. COMPANY SETUP: NexusHR
  // ==========================================
  console.log('🏢 [1/6] Seeding Company: nexusHr / NexusHR...');
  let company = await Company.findOne({
    $or: [{ code: 'NEXUSHR' }, { code: 'NXHR01' }, { name: /nexusHr/i }],
  });

  const companyData = {
    name: 'NexusHR',
    code: 'NEXUSHR',
    email: 'admin@nexushr.com',
    phone: '+91 9871234560',
    website: 'https://nexushr.com',
    address: {
      street: 'Cyber Green Tower B, DLF Phase 3',
      city: 'Gurugram',
      state: 'Haryana',
      zipCode: '122002',
      country: 'India',
    },
    gstNumber: '06AAACN1234F1Z8',
    panNumber: 'AAACN1234F',
    officeLocation: {
      latitude: 28.4986,
      longitude: 77.0878,
      address: 'Cyber Green Tower B, DLF Cyber City, Gurugram, Haryana',
    },
    geoFenceRadius: 300,
    enableGeoFencing: true,
    isActive: true,
    onboardingComplete: true,
    registrationStep: 4,
    subscriptionStatus: 'active',
    subscriptionPlan: 'enterprise',
    trialStartsAt: new Date('2026-01-01'),
    trialEndsAt: new Date('2027-01-01'),
    workHours: {
      start: '09:00',
      end: '18:00',
      workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
  };

  if (!company) {
    company = await Company.create(companyData);
    console.log(`   ✨ Created new Company: ${company.name} (Code: ${company.code}, ID: ${company._id})`);
  } else {
    company = await Company.findByIdAndUpdate(company._id, { $set: companyData }, { new: true });
    console.log(`   🔄 Updated existing Company: ${company.name} (Code: ${company.code}, ID: ${company._id})`);
  }
  const companyId = company._id;

  // Settings
  await Settings.findOneAndUpdate(
    { companyId },
    {
      $set: {
        companyId,
        primaryColor: '#4F46E5',
        secondaryColor: '#06B6D4',
        themeSource: 'custom',
        loginTitle: 'Welcome to NexusHR',
        loginSubtitle: 'Unified Enterprise Human Resource & Agile Operations',
      },
    },
    { upsert: true }
  );

  // ==========================================
  // 2. WORK SHIFTS, DEPARTMENTS, DESIGNATIONS & LEAVE TYPES
  // ==========================================
  console.log('⏰ [2/6] Seeding Work Shifts, Departments, Designations & Leave Types...');

  await WorkShift.deleteMany({ companyId });
  const createdShifts = await WorkShift.insertMany([
    {
      companyId,
      name: 'General Business Shift',
      startTime: '09:00',
      endTime: '18:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lateThreshold: 15,
      gracePeriodMinutes: 15,
      isDefault: true,
    },
    {
      companyId,
      name: 'Engineering Flex Shift',
      startTime: '10:00',
      endTime: '19:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lateThreshold: 30,
      gracePeriodMinutes: 30,
      isDefault: false,
    },
    {
      companyId,
      name: 'Early Bird Shift',
      startTime: '08:00',
      endTime: '17:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lateThreshold: 15,
      gracePeriodMinutes: 15,
      isDefault: false,
    },
  ]);
  const defaultShift = createdShifts[0]._id;
  const devShift = createdShifts[1]._id;

  // Departments
  await Department.deleteMany({ companyId });
  const depts = [
    { name: 'Executive & Management', description: 'Executive leadership, corporate strategy, and governance' },
    { name: 'Engineering & Technology', description: 'Core software engineering, cloud architecture, and platforms' },
    { name: 'Data & AI Research', description: 'AI agents, machine learning models, and workforce analytics' },
    { name: 'Product & Design', description: 'Product management, user experience, and design systems' },
    { name: 'QA & DevOps', description: 'Automated testing, continuous integration, security, and SRE' },
    { name: 'Human Resources & Talent', description: 'Talent acquisition, employee engagement, and people ops' },
    { name: 'Finance & Operations', description: 'Payroll management, fiscal compliance, and workplace operations' },
  ];
  await Department.insertMany(depts.map((d) => ({ ...d, companyId, isActive: true })));

  // Designations
  await Designation.deleteMany({ companyId });
  const designations = [
    { name: 'Chief Executive Officer', department: 'Executive & Management' },
    { name: 'Chief Technology Officer', department: 'Executive & Management' },
    { name: 'Head of People & Culture', department: 'Human Resources & Talent' },
    { name: 'VP of Engineering', department: 'Engineering & Technology' },
    { name: 'VP of Product', department: 'Product & Design' },
    { name: 'Principal AI Scientist', department: 'Data & AI Research' },
    { name: 'DevOps & Cloud Architect', department: 'QA & DevOps' },
    { name: 'Senior QA Automation Lead', department: 'QA & DevOps' },
    { name: 'Principal UI/UX Designer', department: 'Product & Design' },
    { name: 'Senior HR Business Partner', department: 'Human Resources & Talent' },
    { name: 'Talent Acquisition Specialist', department: 'Human Resources & Talent' },
    { name: 'Principal Software Architect', department: 'Engineering & Technology' },
    { name: 'Senior Full Stack Engineer', department: 'Engineering & Technology' },
    { name: 'Senior Frontend Engineer', department: 'Engineering & Technology' },
    { name: 'Mobile Application Engineer', department: 'Engineering & Technology' },
    { name: 'Lead Machine Learning Engineer', department: 'Data & AI Research' },
    { name: 'Site Reliability Engineer', department: 'QA & DevOps' },
    { name: 'Senior Product Manager', department: 'Product & Design' },
    { name: 'Senior Backend Engineer', department: 'Engineering & Technology' },
    { name: 'Full Stack Engineer', department: 'Engineering & Technology' },
    { name: 'UI/UX Designer', department: 'Product & Design' },
    { name: 'Senior Data Scientist', department: 'Data & AI Research' },
    { name: 'Senior QA Automation Engineer', department: 'QA & DevOps' },
    { name: 'Backend Engineer', department: 'Engineering & Technology' },
    { name: 'Frontend Engineer', department: 'Engineering & Technology' },
    { name: 'Machine Learning Engineer', department: 'Data & AI Research' },
    { name: 'QA Test Analyst', department: 'QA & DevOps' },
    { name: 'HR Operations Specialist', department: 'Human Resources & Talent' },
  ];
  await Designation.insertMany(designations.map((d) => ({ ...d, companyId, isActive: true })));

  // Leave Types
  await LeaveType.deleteMany({ companyId });
  await LeaveType.insertMany([
    { companyId, name: 'Paid Time Off', code: 'PTO', defaultDays: 24, isPaid: true, color: '#3B82F6' },
    { companyId, name: 'Sick Leave', code: 'SL', defaultDays: 10, isPaid: true, color: '#EF4444' },
    { companyId, name: 'Casual Leave', code: 'CL', defaultDays: 8, isPaid: true, color: '#F59E0B' },
    { companyId, name: 'Maternity Leave', code: 'ML', defaultDays: 180, isPaid: true, color: '#EC4899' },
    { companyId, name: 'Paternity Leave', code: 'PL', defaultDays: 30, isPaid: true, color: '#8B5CF6' },
  ]);

  console.log('   ✅ Shifts, Departments, Designations and Leave Types seeded.');

  // ==========================================
  // 3. 30 EMPLOYEES SETUP
  // ==========================================
  console.log('👥 [3/6] Seeding 30 Employees for NexusHR...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const rawEmployees = [
    // 1-5 Executive & Leadership
    {
      name: 'Anirudh Bhardwaj',
      email: 'anirudh@nexushr.com',
      role: 'admin',
      empId: 'NX001',
      dept: 'Executive & Management',
      desig: 'Chief Executive Officer',
      salary: 350000,
      dob: '1996-08-14',
      join: '2021-01-15',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'director',
      managerEmpId: null,
    },
    {
      name: 'Elena Vance',
      email: 'elena.vance@nexushr.com',
      role: 'admin',
      empId: 'NX002',
      dept: 'Executive & Management',
      desig: 'Chief Technology Officer',
      salary: 320000,
      dob: '1992-04-18',
      join: '2021-02-01',
      shift: defaultShift,
      city: 'Bengaluru',
      level: 'director',
      managerEmpId: 'NX001',
    },
    {
      name: 'Pooja Malhotra',
      email: 'pooja.malhotra@nexushr.com',
      role: 'hr',
      empId: 'NX003',
      dept: 'Human Resources & Talent',
      desig: 'Head of People & Culture',
      salary: 220000,
      dob: '1993-06-12',
      join: '2021-03-01',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'lead',
      managerEmpId: 'NX001',
    },
    {
      name: 'Aditya Verma',
      email: 'aditya.verma@nexushr.com',
      role: 'manager',
      empId: 'NX004',
      dept: 'Engineering & Technology',
      desig: 'VP of Engineering',
      salary: 270000,
      dob: '1991-03-25',
      join: '2021-04-10',
      shift: devShift,
      city: 'Noida',
      level: 'manager',
      managerEmpId: 'NX002',
    },
    {
      name: 'Rohan Kapoor',
      email: 'rohan.kapoor@nexushr.com',
      role: 'manager',
      empId: 'NX005',
      dept: 'Product & Design',
      desig: 'VP of Product',
      salary: 250000,
      dob: '1992-09-17',
      join: '2021-05-15',
      shift: defaultShift,
      city: 'Delhi',
      level: 'manager',
      managerEmpId: 'NX001',
    },

    // 6-10 Department Leads & Senior Specialists
    {
      name: 'Dr. Aarav Bhattacharya',
      email: 'aarav.b@nexushr.com',
      role: 'manager',
      empId: 'NX006',
      dept: 'Data & AI Research',
      desig: 'Principal AI Scientist',
      salary: 290000,
      dob: '1989-07-22',
      join: '2021-07-01',
      shift: devShift,
      city: 'Delhi',
      level: 'lead',
      managerEmpId: 'NX004',
    },
    {
      name: 'Kavita Joshi',
      email: 'kavita.joshi@nexushr.com',
      role: 'manager',
      empId: 'NX007',
      dept: 'QA & DevOps',
      desig: 'DevOps & Cloud Architect',
      salary: 230000,
      dob: '1993-04-18',
      join: '2021-09-01',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'lead',
      managerEmpId: 'NX004',
    },
    {
      name: 'Siddharth Mehta',
      email: 'siddharth.m@nexushr.com',
      role: 'manager',
      empId: 'NX008',
      dept: 'QA & DevOps',
      desig: 'Senior QA Automation Lead',
      salary: 195000,
      dob: '1994-10-10',
      join: '2021-11-15',
      shift: defaultShift,
      city: 'Noida',
      level: 'lead',
      managerEmpId: 'NX004',
    },
    {
      name: 'Meera Iyer',
      email: 'meera.iyer@nexushr.com',
      role: 'employee',
      empId: 'NX009',
      dept: 'Product & Design',
      desig: 'Principal UI/UX Designer',
      salary: 200000,
      dob: '1994-08-08',
      join: '2022-01-10',
      shift: defaultShift,
      city: 'Bengaluru',
      level: 'senior',
      managerEmpId: 'NX005',
    },
    {
      name: 'Gaurav Taneja',
      email: 'gaurav.taneja@nexushr.com',
      role: 'hr',
      empId: 'NX010',
      dept: 'Human Resources & Talent',
      desig: 'Senior HR Business Partner',
      salary: 155000,
      dob: '1995-02-14',
      join: '2022-02-15',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'hr',
      managerEmpId: 'NX003',
    },

    // 11-15 HR & Core Engineering
    {
      name: 'Neha Sharma',
      email: 'neha.sharma@nexushr.com',
      role: 'hr',
      empId: 'NX011',
      dept: 'Human Resources & Talent',
      desig: 'Talent Acquisition Specialist',
      salary: 130000,
      dob: '1996-11-28',
      join: '2022-04-01',
      shift: defaultShift,
      city: 'Faridabad',
      level: 'hr',
      managerEmpId: 'NX003',
    },
    {
      name: 'Kunal Deshmukh',
      email: 'kunal.deshmukh@nexushr.com',
      role: 'employee',
      empId: 'NX012',
      dept: 'Engineering & Technology',
      desig: 'Principal Software Architect',
      salary: 240000,
      dob: '1991-05-19',
      join: '2022-05-10',
      shift: devShift,
      city: 'Pune',
      level: 'senior',
      managerEmpId: 'NX004',
    },
    {
      name: 'Ishaan Saxena',
      email: 'ishaan.saxena@nexushr.com',
      role: 'employee',
      empId: 'NX013',
      dept: 'Engineering & Technology',
      desig: 'Senior Full Stack Engineer',
      salary: 185000,
      dob: '1995-12-03',
      join: '2022-06-20',
      shift: devShift,
      city: 'Gurugram',
      level: 'senior',
      managerEmpId: 'NX004',
    },
    {
      name: 'Priya Nambiar',
      email: 'priya.nambiar@nexushr.com',
      role: 'employee',
      empId: 'NX014',
      dept: 'Engineering & Technology',
      desig: 'Senior Frontend Engineer',
      salary: 180000,
      dob: '1996-03-11',
      join: '2022-08-01',
      shift: defaultShift,
      city: 'Kochi',
      level: 'senior',
      managerEmpId: 'NX004',
    },
    {
      name: 'Arjun Reddy',
      email: 'arjun.reddy@nexushr.com',
      role: 'employee',
      empId: 'NX015',
      dept: 'Engineering & Technology',
      desig: 'Mobile Application Engineer',
      salary: 170000,
      dob: '1994-09-24',
      join: '2022-09-15',
      shift: devShift,
      city: 'Hyderabad',
      level: 'senior',
      managerEmpId: 'NX004',
    },

    // 16-20 AI Research & Tech Leads
    {
      name: 'Ananya Sen',
      email: 'ananya.sen@nexushr.com',
      role: 'employee',
      empId: 'NX016',
      dept: 'Data & AI Research',
      desig: 'Lead Machine Learning Engineer',
      salary: 200000,
      dob: '1995-04-15',
      join: '2022-10-01',
      shift: devShift,
      city: 'Kolkata',
      level: 'lead',
      managerEmpId: 'NX006',
    },
    {
      name: 'Varun Aggarwal',
      email: 'varun.aggarwal@nexushr.com',
      role: 'employee',
      empId: 'NX017',
      dept: 'QA & DevOps',
      desig: 'Site Reliability Engineer',
      salary: 165000,
      dob: '1993-07-09',
      join: '2022-11-15',
      shift: defaultShift,
      city: 'Chandigarh',
      level: 'senior',
      managerEmpId: 'NX007',
    },
    {
      name: 'Divya Menon',
      email: 'divya.menon@nexushr.com',
      role: 'employee',
      empId: 'NX018',
      dept: 'Product & Design',
      desig: 'Senior Product Manager',
      salary: 195000,
      dob: '1993-10-18',
      join: '2023-01-10',
      shift: defaultShift,
      city: 'Bengaluru',
      level: 'senior',
      managerEmpId: 'NX005',
    },
    {
      name: 'Tanmay Rastogi',
      email: 'tanmay.rastogi@nexushr.com',
      role: 'employee',
      empId: 'NX019',
      dept: 'Engineering & Technology',
      desig: 'Senior Backend Engineer',
      salary: 160000,
      dob: '1997-02-21',
      join: '2023-02-15',
      shift: devShift,
      city: 'Noida',
      level: 'senior',
      managerEmpId: 'NX004',
    },
    {
      name: 'Deepika Chawla',
      email: 'deepika.chawla@nexushr.com',
      role: 'employee',
      empId: 'NX020',
      dept: 'Engineering & Technology',
      desig: 'Senior Frontend Engineer',
      salary: 155000,
      dob: '1997-11-04',
      join: '2023-03-20',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'senior',
      managerEmpId: 'NX004',
    },

    // 21-25 Full Stack, Design & QA Engineers
    {
      name: 'Karan Bansal',
      email: 'karan.bansal@nexushr.com',
      role: 'employee',
      empId: 'NX021',
      dept: 'Engineering & Technology',
      desig: 'Full Stack Engineer',
      salary: 145000,
      dob: '1996-05-17',
      join: '2023-05-01',
      shift: devShift,
      city: 'Delhi',
      level: 'senior',
      managerEmpId: 'NX004',
    },
    {
      name: 'Aayushi Roy',
      email: 'aayushi.roy@nexushr.com',
      role: 'employee',
      empId: 'NX022',
      dept: 'Product & Design',
      desig: 'UI/UX Designer',
      salary: 125000,
      dob: '1998-03-29',
      join: '2023-07-10',
      shift: defaultShift,
      city: 'Kolkata',
      level: 'junior',
      managerEmpId: 'NX009',
    },
    {
      name: 'Pranav Mukherjee',
      email: 'pranav.m@nexushr.com',
      role: 'employee',
      empId: 'NX023',
      dept: 'Data & AI Research',
      desig: 'Senior Data Scientist',
      salary: 160000,
      dob: '1996-12-19',
      join: '2023-09-01',
      shift: devShift,
      city: 'Delhi',
      level: 'senior',
      managerEmpId: 'NX006',
    },
    {
      name: 'Naveen Choudhary',
      email: 'naveen.c@nexushr.com',
      role: 'employee',
      empId: 'NX024',
      dept: 'QA & DevOps',
      desig: 'Senior QA Automation Engineer',
      salary: 135000,
      dob: '1995-09-05',
      join: '2023-10-15',
      shift: defaultShift,
      city: 'Jaipur',
      level: 'senior',
      managerEmpId: 'NX008',
    },
    {
      name: 'Ritika Bose',
      email: 'ritika.bose@nexushr.com',
      role: 'employee',
      empId: 'NX025',
      dept: 'Product & Design',
      desig: 'UI/UX Designer',
      salary: 115000,
      dob: '1999-01-20',
      join: '2023-12-01',
      shift: defaultShift,
      city: 'Noida',
      level: 'junior',
      managerEmpId: 'NX009',
    },

    // 26-30 Engineers, Data & HR Operations
    {
      name: 'Alok Mathur',
      email: 'alok.mathur@nexushr.com',
      role: 'employee',
      empId: 'NX026',
      dept: 'Engineering & Technology',
      desig: 'Backend Engineer',
      salary: 130000,
      dob: '1996-06-08',
      join: '2024-01-15',
      shift: devShift,
      city: 'Lucknow',
      level: 'junior',
      managerEmpId: 'NX012',
    },
    {
      name: 'Swati Tripathi',
      email: 'swati.tripathi@nexushr.com',
      role: 'employee',
      empId: 'NX027',
      dept: 'Engineering & Technology',
      desig: 'Frontend Engineer',
      salary: 125000,
      dob: '1998-09-14',
      join: '2024-03-01',
      shift: defaultShift,
      city: 'Gurugram',
      level: 'junior',
      managerEmpId: 'NX014',
    },
    {
      name: 'Abhishek Ghosh',
      email: 'abhishek.ghosh@nexushr.com',
      role: 'employee',
      empId: 'NX028',
      dept: 'Data & AI Research',
      desig: 'Machine Learning Engineer',
      salary: 135000,
      dob: '1997-03-31',
      join: '2024-04-10',
      shift: devShift,
      city: 'Kolkata',
      level: 'junior',
      managerEmpId: 'NX016',
    },
    {
      name: 'Pallavi Hegde',
      email: 'pallavi.hegde@nexushr.com',
      role: 'employee',
      empId: 'NX029',
      dept: 'QA & DevOps',
      desig: 'QA Test Analyst',
      salary: 115000,
      dob: '1998-12-11',
      join: '2024-05-15',
      shift: defaultShift,
      city: 'Bengaluru',
      level: 'junior',
      managerEmpId: 'NX008',
    },
    {
      name: 'Bhavna Rajput',
      email: 'bhavna.rajput@nexushr.com',
      role: 'hr',
      empId: 'NX030',
      dept: 'Human Resources & Talent',
      desig: 'HR Operations Specialist',
      salary: 105000,
      dob: '1998-10-25',
      join: '2024-06-01',
      shift: defaultShift,
      city: 'Delhi',
      level: 'hr',
      managerEmpId: 'NX003',
    },
  ];

  // Pass 1: Upsert all 30 employees
  const empMap = new Map<string, any>();
  for (const emp of rawEmployees) {
    const doc = await User.findOneAndUpdate(
      { email: emp.email },
      {
        $set: {
          name: emp.name,
          email: emp.email,
          password: hashedPassword,
          role: emp.role,
          companyId,
          employeeId: emp.empId,
          department: emp.dept,
          designation: emp.desig,
          salary: emp.salary,
          dob: new Date(emp.dob),
          joiningDate: new Date(emp.join),
          workShiftId: emp.shift,
          hierarchyLevel: emp.level,
          probationStatus: new Date(emp.join) < new Date('2024-01-01') ? 'confirmed' : 'on_probation',
          probationMonths: 3,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`,
          address: {
            street: 'Innovation Avenue',
            city: emp.city,
            state: 'Haryana',
            country: 'India',
            zipCode: '122002',
          },
          bio: `${emp.desig} at NexusHR. Dedicated to advancing human capital operations, software quality, and cutting-edge workplace AI solutions.`,
          isActive: true,
          leaveBalances: {
            annual: { allocated: 24, used: Math.floor(Math.random() * 6), remaining: 18 },
            casual: { allocated: 8, used: Math.floor(Math.random() * 3), remaining: 5 },
            sick: { allocated: 10, used: Math.floor(Math.random() * 2), remaining: 8 },
          },
        },
      },
      { upsert: true, new: true }
    );
    empMap.set(emp.empId, doc);
  }

  // Pass 2: Set reportsTo references
  for (const emp of rawEmployees) {
    if (emp.managerEmpId && empMap.has(emp.managerEmpId)) {
      const userDoc = empMap.get(emp.empId);
      const managerDoc = empMap.get(emp.managerEmpId);
      await User.findByIdAndUpdate(userDoc._id, { $set: { reportsTo: managerDoc._id } });
    }
  }

  console.log(`   ✅ Successfully seeded ${empMap.size} employees with login password: 'password123'.`);

  // ==========================================
  // 4. 1 FLAGSHIP PROJECT SETUP
  // ==========================================
  console.log('🚀 [4/6] Seeding 1 Flagship Project: NexusHR Enterprise Cloud Platform...');

  const ceo = empMap.get('NX001');
  const vpEng = empMap.get('NX004');

  const boardColumns = [
    { id: 'col-backlog', name: 'Backlog', status: 'backlog', color: '#6B7280', position: 0 },
    { id: 'col-todo', name: 'To Do', status: 'to_do', color: '#3B82F6', position: 1 },
    { id: 'col-progress', name: 'In Progress', status: 'in_progress', color: '#F59E0B', position: 2, wipLimit: 10 },
    { id: 'col-review', name: 'In Review', status: 'in_review', color: '#8B5CF6', position: 3, wipLimit: 8 },
    { id: 'col-done', name: 'Completed', status: 'completed', color: '#10B981', position: 4 },
  ];

  // Pick team members
  const memberEmpIds = [
    'NX004', 'NX006', 'NX007', 'NX008', 'NX009',
    'NX012', 'NX013', 'NX014', 'NX015', 'NX016',
    'NX017', 'NX018', 'NX019', 'NX020', 'NX021',
    'NX022', 'NX023', 'NX024', 'NX026', 'NX027',
  ];
  const projectMembers = memberEmpIds.map((empId, idx) => ({
    employeeId: empMap.get(empId)._id,
    role: idx === 0 ? 'project_manager' : idx < 5 ? 'team_lead' : 'developer',
    joinedAt: new Date('2026-01-10'),
    allocationPercentage: 100,
  }));

  const milestones = [
    {
      id: 'm1',
      name: 'M1: Geofenced Attendance & Shift Engine',
      description: 'GPS boundaries, late tolerance, and mobile check-in verification',
      dueDate: new Date('2026-02-28'),
      status: 'completed',
      completedAt: new Date('2026-02-26'),
    },
    {
      id: 'm2',
      name: 'M2: AI HR Chatbot & Knowledge Base RAG',
      description: 'Interactive company handbook querying with Groq/NVIDIA LLM',
      dueDate: new Date('2026-04-15'),
      status: 'completed',
      completedAt: new Date('2026-04-12'),
    },
    {
      id: 'm3',
      name: 'M3: Agile Sprint & Kanban Orchestrator',
      description: 'Real-time drag and drop task management with WebSocket sync',
      dueDate: new Date('2026-06-30'),
      status: 'in_progress',
    },
    {
      id: 'm4',
      name: 'M4: Predictive Retention & Flight Risk Models',
      description: 'Machine learning anomaly detection for employee retention',
      dueDate: new Date('2026-09-30'),
      status: 'pending',
    },
    {
      id: 'm5',
      name: 'M5: Enterprise Payroll & Compliance Suite',
      description: 'Automated salary disbursal, tax withholding, and audit trails',
      dueDate: new Date('2026-12-15'),
      status: 'pending',
    },
  ];

  let project = await Project.findOne({
    companyId,
    projectNumber: 'PRJ-NX-001',
  });

  const projectPayload = {
    projectNumber: 'PRJ-NX-001',
    name: 'NexusHR Enterprise Cloud Platform',
    description: 'Unified AI-powered human resource management, agile task orchestration, and intelligent workforce analytics platform.',
    status: 'active',
    priority: 'critical',
    companyId,
    managerId: vpEng._id,
    createdBy: ceo._id,
    startDate: new Date('2026-01-10'),
    endDate: new Date('2026-12-31'),
    actualStartDate: new Date('2026-01-10'),
    budget: 150000,
    spent: 48500,
    currency: 'USD',
    progressPercentage: 62,
    members: projectMembers,
    milestones,
    board: {
      id: 'board-nx-001',
      name: 'NexusHR Agile Kanban Board',
      type: 'kanban',
      columns: boardColumns,
      defaultView: 'board',
    },
    useSprints: true,
  };

  if (!project) {
    project = await Project.create(projectPayload);
    console.log(`   ✨ Created Project: ${project.name} (${project.projectNumber}, ID: ${project._id})`);
  } else {
    project = await Project.findByIdAndUpdate(project._id, { $set: projectPayload }, { new: true });
    console.log(`   🔄 Updated Project: ${project.name} (${project.projectNumber}, ID: ${project._id})`);
  }
  const projectId = project._id;

  // Active Sprint
  await Sprint.deleteMany({ projectId });
  const activeSprint = await Sprint.create({
    sprintNumber: 'SP-NX-01',
    name: 'Sprint 1: Platform Core & AI Integrations',
    description: 'Stabilize Core Kanban features, vector policy retrieval, and mobile GPS check-in',
    projectId,
    companyId,
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-20'),
    status: 'active',
    goals: ['Deliver Kanban board sync', 'Fine-tune HR AI vector responses', 'Validate mobile GPS attendance'],
    totalTasks: 30,
    completedTasks: 5,
    storyPoints: 85,
    completedStoryPoints: 18,
    createdBy: vpEng._id,
  });
  console.log(`   🎯 Active Sprint created: ${activeSprint.name} (${activeSprint.sprintNumber})`);

  // ==========================================
  // 5. 30 TASKS SETUP
  // ==========================================
  console.log('📋 [5/6] Seeding 30 Detailed Tasks for the Project...');

  await Task.deleteMany({ projectId });

  const tasksData = [
    // 5 COMPLETED TASKS
    {
      taskNumber: 'NX-101',
      title: 'Geofencing Polygon Attendance Validation Engine',
      description: 'Implement Haversine distance calculations and circular radius check against company office coordinates for check-in eligibility.',
      status: 'completed',
      priority: 'critical',
      taskType: 'epic',
      colId: 'col-done',
      assignees: ['NX012', 'NX017'],
      points: 8,
      est: 32,
      act: 30,
      prog: 100,
      completedAt: new Date('2026-11-04'),
    },
    {
      taskNumber: 'NX-102',
      title: 'Mobile Geolocation Check-In & Native Device Sync',
      description: 'Integrate @capacitor/geolocation plugin with background watchPosition support and offline punch-in queueing.',
      status: 'completed',
      priority: 'high',
      taskType: 'story',
      colId: 'col-done',
      assignees: ['NX015'],
      points: 5,
      est: 20,
      act: 18,
      prog: 100,
      completedAt: new Date('2026-11-05'),
    },
    {
      taskNumber: 'NX-103',
      title: 'Fix Android GPS Altitude Drift During Indoor Check-in',
      description: 'Add horizontal accuracy threshold filter (< 40m) to reject noisy indoor GPS fixes before checking office geofence.',
      status: 'completed',
      priority: 'medium',
      taskType: 'bug',
      colId: 'col-done',
      assignees: ['NX015', 'NX008'],
      points: 3,
      est: 12,
      act: 10,
      prog: 100,
      completedAt: new Date('2026-11-06'),
    },
    {
      taskNumber: 'NX-104',
      title: 'Dynamic Work Shift Evaluation & Grace Period Policy',
      description: 'Calculate late arrival penalties factoring in the 15-minute grace threshold and flexible developer shift schedules.',
      status: 'completed',
      priority: 'high',
      taskType: 'story',
      colId: 'col-done',
      assignees: ['NX013'],
      points: 5,
      est: 16,
      act: 15,
      prog: 100,
      completedAt: new Date('2026-11-07'),
    },
    {
      taskNumber: 'NX-105',
      title: 'Cache Company Shift Configurations in Memory for Instant Swipes',
      description: 'Eliminate duplicate Mongo reads during peak morning punch-ins by caching active shift rosters.',
      status: 'completed',
      priority: 'low',
      taskType: 'improvement',
      colId: 'col-done',
      assignees: ['NX019'],
      points: 2,
      est: 8,
      act: 7,
      prog: 100,
      completedAt: new Date('2026-11-08'),
    },

    // 5 IN REVIEW TASKS
    {
      taskNumber: 'NX-106',
      title: 'NVIDIA NIM & Groq LLM Inference Gateway for HR Chatbot',
      description: 'Setup streaming completions with automatic provider fallbacks between NVIDIA Llama-3-70b and Groq Mixtral.',
      status: 'in_review',
      priority: 'critical',
      taskType: 'epic',
      colId: 'col-review',
      assignees: ['NX006', 'NX016'],
      points: 8,
      est: 28,
      act: 26,
      prog: 90,
    },
    {
      taskNumber: 'NX-107',
      title: 'Semantic Vector Retrieval for Company HR Knowledge Base',
      description: 'Extract keyword tags and query embeddings to inject top 3 policy documents into LLM system prompt context.',
      status: 'in_review',
      priority: 'high',
      taskType: 'story',
      colId: 'col-review',
      assignees: ['NX016', 'NX023'],
      points: 5,
      est: 20,
      act: 18,
      prog: 85,
    },
    {
      taskNumber: 'NX-108',
      title: 'Real-Time Leave Balance Querying Tool via MCP Server',
      description: 'Allow HR chatbot to dynamically invoke user leave entitlement tools to respond with live PTO balances.',
      status: 'in_review',
      priority: 'high',
      taskType: 'story',
      colId: 'col-review',
      assignees: ['NX013'],
      points: 5,
      est: 16,
      act: 14,
      prog: 80,
    },
    {
      taskNumber: 'NX-109',
      title: 'Fix KaTeX Formatting & Code Snippet Rendering in AI Stream',
      description: 'Sanitize streaming Markdown tokens in HRChatbot component to prevent HTML entities leaking on incomplete chunks.',
      status: 'in_review',
      priority: 'medium',
      taskType: 'bug',
      colId: 'col-review',
      assignees: ['NX014'],
      points: 3,
      est: 10,
      act: 9,
      prog: 95,
    },
    {
      taskNumber: 'NX-110',
      title: 'Employee Chatbot Feedback Rating System (Helpful / Not Helpful)',
      description: 'Store thumbs up/down and feedback comments in AIConversationLog to track knowledge base accuracy metrics.',
      status: 'in_review',
      priority: 'low',
      taskType: 'improvement',
      colId: 'col-review',
      assignees: ['NX020'],
      points: 2,
      est: 8,
      act: 7,
      prog: 90,
    },

    // 8 IN PROGRESS TASKS
    {
      taskNumber: 'NX-111',
      title: 'Interactive Kanban Board with Drag and Drop Support',
      description: 'Build responsive 5-column Kanban board allowing smooth task dragging with optimistic UI updates.',
      status: 'in_progress',
      priority: 'critical',
      taskType: 'epic',
      colId: 'col-progress',
      assignees: ['NX014', 'NX021'],
      points: 8,
      est: 35,
      act: 22,
      prog: 65,
    },
    {
      taskNumber: 'NX-112',
      title: 'Socket.io Real-Time Column Reordering Broadcast',
      description: 'Broadcast task moves across connected team members in real-time so boards update without manual refresh.',
      status: 'in_progress',
      priority: 'high',
      taskType: 'story',
      colId: 'col-progress',
      assignees: ['NX019', 'NX021'],
      points: 5,
      est: 18,
      act: 12,
      prog: 70,
    },
    {
      taskNumber: 'NX-113',
      title: 'Task Dependency Graph & Blocker Warning Banners',
      description: 'Prevent tasks from moving to In Progress or Completed when unresolved prerequisite tasks are in backlog.',
      status: 'in_progress',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-progress',
      assignees: ['NX012', 'NX024'],
      points: 5,
      est: 18,
      act: 9,
      prog: 50,
    },
    {
      taskNumber: 'NX-114',
      title: 'Fix WIP Limit Overflow Warning Modal on Rapid Drag',
      description: 'Ensure WIP limit validation checks server response atomically before re-rendering cards in target column.',
      status: 'in_progress',
      priority: 'high',
      taskType: 'bug',
      colId: 'col-progress',
      assignees: ['NX024'],
      points: 3,
      est: 12,
      act: 7,
      prog: 60,
    },
    {
      taskNumber: 'NX-115',
      title: 'Granular Activity Audit Log for Status Transitions',
      description: 'Record timestamped diffs showing user, previous column, next column, and optional comment upon every status change.',
      status: 'in_progress',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-progress',
      assignees: ['NX013'],
      points: 3,
      est: 14,
      act: 10,
      prog: 75,
    },
    {
      taskNumber: 'NX-116',
      title: 'Cloudinary Image & Document Attachment Upload Service',
      description: 'Enable drag-and-drop file attachments in task modal with automatic image thumbnailing and preview modal.',
      status: 'in_progress',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-progress',
      assignees: ['NX026'],
      points: 3,
      est: 15,
      act: 6,
      prog: 45,
    },
    {
      taskNumber: 'NX-117',
      title: 'Auto-Mention Team Leads When Priority is Escalated to Critical',
      description: 'Automatically trigger email and in-app bell notification when any task priority shifts to Critical.',
      status: 'in_progress',
      priority: 'low',
      taskType: 'improvement',
      colId: 'col-progress',
      assignees: ['NX027'],
      points: 2,
      est: 8,
      act: 4,
      prog: 55,
    },
    {
      taskNumber: 'NX-118',
      title: 'Sprint Velocity & Daily Burndown Chart Component',
      description: 'Render interactive SVG/Recharts burndown showing ideal progress versus actual story point completion.',
      status: 'in_progress',
      priority: 'high',
      taskType: 'story',
      colId: 'col-progress',
      assignees: ['NX020', 'NX009'],
      points: 5,
      est: 22,
      act: 9,
      prog: 40,
    },

    // 6 TO DO TASKS
    {
      taskNumber: 'NX-119',
      title: 'Multi-Currency Salary Structure & Automated Payroll Engine',
      description: 'Design flexible salary breakup rules including Basic, HRA, Special Allowance, and Performance Bonus components.',
      status: 'to_do',
      priority: 'critical',
      taskType: 'epic',
      colId: 'col-todo',
      assignees: ['NX012', 'NX019'],
      points: 8,
      est: 36,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-120',
      title: 'Indian Income Tax TDS & PF Contribution Calculator',
      description: 'Implement automated Section 80C, 80D tax slab estimations and Provident Fund employee/employer deduction math.',
      status: 'to_do',
      priority: 'high',
      taskType: 'story',
      colId: 'col-todo',
      assignees: ['NX019'],
      points: 5,
      est: 24,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-121',
      title: 'Automated Monthly Payslip PDF Generator with QR Verification',
      description: 'Generate password-protected salary slips with company branding, tax breakdown, and verification QR code.',
      status: 'to_do',
      priority: 'high',
      taskType: 'story',
      colId: 'col-todo',
      assignees: ['NX026', 'NX022'],
      points: 5,
      est: 20,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-122',
      title: 'Expense Reimbursement Submission & Multi-Tier Approval Chain',
      description: 'Allow employees to submit travel and meal claims with manager approval and finance controller sign-off.',
      status: 'to_do',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-todo',
      assignees: ['NX021'],
      points: 5,
      est: 18,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-123',
      title: 'Probation End Reminder & Auto-Confirmation Workflow',
      description: 'Send managers 14-day advance notification to complete probation review before auto-confirming status.',
      status: 'to_do',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-todo',
      assignees: ['NX027'],
      points: 3,
      est: 12,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-124',
      title: 'Digital Resignation & Exit Clearance Checklist Workflow',
      description: 'Multi-department clearance module covering IT hardware return, finance no-dues, and HR exit interview.',
      status: 'to_do',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-todo',
      assignees: ['NX014', 'NX010'],
      points: 3,
      est: 14,
      act: 0,
      prog: 0,
    },

    // 6 BACKLOG TASKS
    {
      taskNumber: 'NX-125',
      title: 'Predictive Attrition & Employee Flight Risk AI Model',
      description: 'Train Random Forest / Logistic Regression model using attendance anomalies, overtime hours, and tenure to predict attrition risk.',
      status: 'backlog',
      priority: 'high',
      taskType: 'epic',
      colId: 'col-backlog',
      assignees: ['NX006', 'NX023'],
      points: 8,
      est: 40,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-126',
      title: 'Daily Swipe-In Pattern Anomaly Detection Algorithm',
      description: 'Identify unusual swipe patterns (frequent consecutive late arrivals, abrupt drop in daily work duration).',
      status: 'backlog',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-backlog',
      assignees: ['NX028'],
      points: 5,
      est: 22,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-127',
      title: 'Anonymous Quarterly Pulse Survey & Sentiment Heatmap',
      description: 'Configurable eNPS surveys with natural language sentiment clustering across departments.',
      status: 'backlog',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-backlog',
      assignees: ['NX018', 'NX025'],
      points: 5,
      est: 20,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-128',
      title: 'Single Sign-On (SSO) Support with SAML 2.0 & Okta',
      description: 'Allow enterprise customers to authenticate their corporate directories via SAML / OpenID Connect.',
      status: 'backlog',
      priority: 'high',
      taskType: 'story',
      colId: 'col-backlog',
      assignees: ['NX007', 'NX012'],
      points: 5,
      est: 24,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-129',
      title: 'Granular Role-Based Access Control (RBAC) Matrix',
      description: 'Custom permission toggles for department heads, auditors, and external contractors.',
      status: 'backlog',
      priority: 'medium',
      taskType: 'story',
      colId: 'col-backlog',
      assignees: ['NX012'],
      points: 3,
      est: 16,
      act: 0,
      prog: 0,
    },
    {
      taskNumber: 'NX-130',
      title: 'Outbound Webhooks for Slack & Microsoft Teams Notifications',
      description: 'Send instant notifications to designated team channels on new hire onboarding, approved leaves, and sprint milestones.',
      status: 'backlog',
      priority: 'low',
      taskType: 'improvement',
      colId: 'col-backlog',
      assignees: ['NX021'],
      points: 2,
      est: 10,
      act: 0,
      prog: 0,
    },
  ];

  const labelPalette = [
    { name: 'Core Architecture', color: '#6366F1' },
    { name: 'AI & Data Science', color: '#EC4899' },
    { name: 'Mobile App', color: '#10B981' },
    { name: 'Frontend UX', color: '#3B82F6' },
    { name: 'Backend API', color: '#8B5CF6' },
    { name: 'DevOps & Cloud', color: '#F59E0B' },
    { name: 'Security & Auth', color: '#EF4444' },
    { name: 'HR Operations', color: '#14B8A6' },
  ];

  const createdTasks = [];
  for (let i = 0; i < tasksData.length; i++) {
    const t = tasksData[i];
    const assignedUserIds = t.assignees.map((id) => empMap.get(id)?._id).filter(Boolean);
    const assignedBy = vpEng._id;

    const startDate = new Date('2026-11-01');
    const dueDate = new Date('2026-11-25');
    const label = labelPalette[i % labelPalette.length];

    const taskDoc = await Task.create({
      taskNumber: t.taskNumber,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      taskType: t.taskType,
      projectId,
      companyId,
      assignedTo: assignedUserIds,
      assignedBy,
      createdBy: vpEng._id,
      startDate,
      dueDate,
      completedAt: t.completedAt,
      estimatedHours: t.est,
      actualHours: t.act,
      progressPercentage: t.prog,
      storyPoints: t.points,
      boardColumnId: t.colId,
      sprintId: activeSprint._id,
      position: i,
      labels: [{ name: label.name, color: label.color }],
      tags: [t.taskType, t.priority, label.name.toLowerCase().replace(/\s+/g, '-')],
    });
    createdTasks.push(taskDoc);
  }

  // Link tasks back to sprint
  await Sprint.findByIdAndUpdate(activeSprint._id, {
    $set: {
      taskIds: createdTasks.map((t) => t._id),
    },
  });

  console.log(`   ✅ Seeded ${createdTasks.length} tasks across Backlog, To Do, In Progress, In Review, Completed.`);

  // ==========================================
  // 6. EXTENSIVE KNOWLEDGE BASE (HRKnowledgeBase)
  // ==========================================
  console.log('📚 [6/6] Seeding Comprehensive HR Knowledge Base for NexusHR...');

  await HRKnowledgeBase.deleteMany({ companyId });

  const hrArticles = [
    // 1. PTO
    {
      category: 'pto',
      title: 'NexusHR Paid Time Off (PTO) & Annual Vacation Policy',
      content: `All regular, full-time employees at NexusHR are entitled to 24 days of Paid Time Off (PTO) per calendar year, accrued at 2.0 days per completed month of service.
- **Advance Notice**: For planned vacations longer than 3 consecutive working days, submit your leave request via the NexusHR portal at least 7 calendar days in advance.
- **Approval Flow**: Requests are automatically routed to your direct reporting manager. For leaves exceeding 10 consecutive working days, HR Business Partner review is also required.
- **Annual Rollover**: Employees may carry over up to 5 unused PTO days into the following calendar year. Rollover days must be consumed by March 31st or they lapse.
- **Encashment**: Unused PTO balances are fully encashed based on the basic salary component upon separation or resignation.`,
      keywords: ['pto', 'vacation', 'annual leave', 'leave accrual', 'time off', 'holiday', 'rollover', 'encashment', 'reporting manager'],
      priority: 10,
    },
    {
      category: 'pto',
      title: 'Sick Leave, Emergency Medical Absence & Hospitalization',
      content: `NexusHR provides 10 paid Sick Leave (SL) days per year, credited on January 1st (prorated for mid-year joiners).
- **Notification**: Notify your direct manager and team via Slack or the NexusHR portal by 9:30 AM on the day of unplanned absence.
- **Medical Documentation**: A certified medical practitioner's note/prescription is required when sick leave exceeds 2 consecutive working days.
- **Extended Medical Leave**: For severe medical conditions requiring hospitalization, employees can apply for extended medical leave under the Group Mediclaim policy.
- **Encashment / Carryover**: Sick leaves cannot be encashed or carried forward into the next year.`,
      keywords: ['sick leave', 'medical leave', 'doctor note', 'illness', 'hospitalization', 'emergency leave', 'health absence'],
      priority: 9,
    },
    {
      category: 'pto',
      title: 'Parental Leave Policy: Maternity, Paternity & Adoption',
      content: `NexusHR is deeply committed to supporting parents welcoming a new child:
- **Maternity Leave**: 26 weeks (182 calendar days) of fully paid leave for birth mothers. Can be initiated up to 8 weeks prior to the expected delivery date.
- **Paternity Leave**: 4 weeks (28 calendar days) of fully paid leave for secondary caregivers / biological or adoptive fathers, to be availed within 6 months of delivery.
- **Adoption & Surrogacy**: 12 weeks of fully paid leave for legal adoptive parents adopting an infant below 12 months of age.
- **Flexible Return**: New parents can request a gradual return-to-work schedule (part-time or hybrid) for the first 2 months following maternity leave.`,
      keywords: ['maternity', 'paternity', 'parental leave', 'childcare', 'pregnancy', 'adoption', 'surrogacy', 'infant', 'mother', 'father'],
      priority: 8,
    },
    {
      category: 'pto',
      title: 'Compassionate Bereavement & Special Occasion Leaves',
      content: `We support our team members through life's milestones and hardships:
- **Bereavement Leave**: 5 days of paid bereavement leave in the unfortunate event of the loss of an immediate family member (spouse, child, parent, sibling).
- **Marriage Leave**: 3 days of additional paid leave for an employee's own wedding.
- **Volunteer & Community Leave**: 1 paid day per calendar year dedicated to recognized charitable or environmental volunteer initiatives.`,
      keywords: ['bereavement', 'marriage', 'compassionate leave', 'death', 'family emergency', 'wedding', 'volunteer day'],
      priority: 6,
    },

    // 2. HOLIDAYS
    {
      category: 'holidays',
      title: 'Official Company Holidays & Optional Observances 2026',
      content: `NexusHR observes 12 mandatory public holidays and 2 floating/optional holidays per calendar year:
- **New Year's Day**: Thursday, January 1, 2026
- **Republic Day**: Monday, January 26, 2026
- **Holi (Festival of Colors)**: Wednesday, March 4, 2026
- **Good Friday**: Friday, April 3, 2026
- **Eid-ul-Fitr**: Friday, March 20, 2026
- **Independence Day**: Saturday, August 15, 2026
- **Mahatma Gandhi Jayanti**: Friday, October 2, 2026
- **Dussehra (Vijayadashami)**: Tuesday, October 20, 2026
- **Diwali / Deepavali**: Sunday, November 8 & Monday, November 9, 2026
- **Guru Nanak Jayanti**: Tuesday, November 24, 2026
- **Christmas Day**: Friday, December 25, 2026
**Floating Holidays**: Choose any 2 cultural or regional festivals from the NexusHR holiday directory with 5 business days advance notice.`,
      keywords: ['holidays', 'calendar', 'public holidays', 'festival', 'national holiday', 'floating holiday', 'closure', 'diwali', 'christmas'],
      priority: 10,
    },

    // 3. BENEFITS
    {
      category: 'benefits',
      title: 'Comprehensive Group Medical, Health & Dental Insurance',
      content: `NexusHR provides extensive health insurance coverage for all full-time employees and their dependents:
- **Coverage Amount**: INR 5,00,000 / $6,500 annual floater cover per family unit (Employee + Spouse + up to 2 Children + Dependent Parents).
- **Cashless Network**: Valid across 8,000+ network hospitals via the MediBuddy / Insurance portal.
- **OPD & Dental Care**: Annual reimbursement allowance up to INR 15,000 for outpatient consultations, diagnostics, routine dental cleanings, and prescription eyewear.
- **Maternity In-Patient Coverage**: Up to INR 75,000 for normal deliveries and INR 1,00,000 for C-section procedures, with no waiting period for corporate employees.
- **Accessing E-Card**: Download your digital TPA health card directly under the NexusHR portal -> Benefits -> Insurance Cards.`,
      keywords: ['insurance', 'mediclaim', 'medical', 'dental', 'health insurance', 'hospitalization', 'dependents', 'opd', 'cashless', 'tpa'],
      priority: 10,
    },
    {
      category: 'benefits',
      title: 'Monthly Health, Gym & Mental Wellness Allowance',
      content: `Physical and mental wellness are vital to our collective performance and happiness:
- **Monthly Stipend**: Up to INR 2,500 / $35 per month reimbursed for gym memberships, CrossFit, swimming, yoga studios, sports gear, or meditation apps (Headspace, Calm).
- **Free Tele-Counseling**: 24/7 confidential access to licensed mental health counselors and emotional support professionals via our partner 1to1Help.
- **Submission**: Upload payment invoices under NexusHR -> Reimbursements -> Wellness by the 25th of each month for inclusion in the upcoming payroll.`,
      keywords: ['gym', 'fitness', 'wellness', 'mental health', 'counseling', 'stipend', 'yoga', 'reimbursement', 'headspace'],
      priority: 7,
    },
    {
      category: 'benefits',
      title: 'Annual Learning, Certification & Upskilling Budget',
      content: `We invest proactively in the lifelong learning of our team members:
- **Annual Budget**: Each full-time employee receives up to INR 50,000 / $600 per year for professional certifications (AWS, GCP, CKA, PMP, Scrym, etc.), technical books, workshops, and industry conferences.
- **Approval**: Discuss the target course or certification with your direct manager during 1-on-1s and submit the request in the portal.
- **Reimbursement**: Submit your completion certificate and paid invoice to receive 100% reimbursement on the next pay cycle.`,
      keywords: ['learning', 'certification', 'training', 'upskilling', 'books', 'conference', 'education', 'aws', 'gcp', 'tuition'],
      priority: 8,
    },

    // 4. HANDBOOK & WORKPLACE POLICIES
    {
      category: 'handbook',
      title: 'NexusHR Code of Conduct, Workplace Ethics & POSH Policy',
      content: `NexusHR is founded on mutual trust, psychological safety, and equal opportunity for every team member:
- **Zero Tolerance on Harassment**: We maintain strict zero-tolerance towards sexual harassment, discriminatory remarks, bullying, or intimidation.
- **Internal Complaints Committee (ICC)**: Any employee may lodge a confidential inquiry directly with the ICC at icc@nexushr.com. All complaints are investigated within 7 business days under the POSH Act guidelines.
- **Conflicts of Interest**: Outside secondary employment, consulting, or moonlighting with competing entities is strictly prohibited without prior written authorization from the CEO.
- **Intellectual Property**: Any software, architecture, documentation, or patents conceived during employment remain the sole intellectual property of NexusHR.`,
      keywords: ['code of conduct', 'ethics', 'posh', 'harassment', 'discrimination', 'icc', 'conflict of interest', 'moonlighting', 'ip'],
      priority: 10,
    },
    {
      category: 'handbook',
      title: 'Hybrid Work Model, Office Hours & Remote Ergonomics',
      content: `NexusHR operates on a collaborative hybrid work model:
- **Work Rhythm**: Team members work 3 days in-office (Tuesday, Wednesday, Thursday) and 2 days flexible remote (Monday & Friday), subject to team lead agreement.
- **Core Collaboration Hours**: 10:30 AM to 5:00 PM IST is our core sync window for standups, design reviews, and cross-functional meetings.
- **Home Setup Allowance**: One-time INR 20,000 / $250 stipend during onboarding to purchase an ergonomic chair, dual-monitor setup, keyboard, or desk accessories.
- **Internet Reimbursement**: Monthly broadband subsidy of up to INR 1,200 for team members working in hybrid or remote roles.`,
      keywords: ['hybrid', 'remote work', 'wfh', 'office hours', 'core hours', 'ergonomics', 'broadband', 'home office', 'internet allowance'],
      priority: 9,
    },

    // 5. PROCEDURES
    {
      category: 'procedures',
      title: 'Business Travel, Daily Per Diem & Expense Reimbursement SOP',
      content: `Procedures for official business travel and client on-site visits:
- **Flight & Hotel Bookings**: Book domestic flights and approved corporate hotels through the travel desk (travel@nexushr.com) at least 7 days prior to travel.
- **Daily Per Diem (Food & Incidentals)**:
  - Tier 1 Cities (Delhi NCR, Mumbai, Bengaluru): INR 2,200 per day.
  - Tier 2 Cities: INR 1,600 per day.
- **Local Conveyance**: App-based cab receipts (Uber, Ola) for transit between client offices, hotels, and airports are 100% claimable.
- **Filing Claims**: Submit itemized GST invoices with proof of payment within 15 days of travel completion. Approved claims are settled in the next payroll cycle.`,
      keywords: ['travel', 'per diem', 'expenses', 'reimbursement', 'hotels', 'flights', 'conveyance', 'sop', 'bills', 'gst'],
      priority: 8,
    },
    {
      category: 'procedures',
      title: 'IT Asset Security, Clean Desk & Device Protection Guidelines',
      content: `Maintaining customer data security and ISO 27001 compliance is everyone's responsibility:
- **Company Hardware**: Only NexusHR-managed MacBooks/Laptops with full-disk BitLocker/FileVault encryption and CrowdStrike EDR agents may access internal repositories and production environments.
- **Password Hygiene**: Passwords must contain a minimum of 12 characters, including uppercase, lowercase, numbers, and symbols. 2FA/MFA is mandatory across GitHub, AWS, and Google Workspace.
- **Clean Desk Policy**: Never leave physical confidential documents or access badges unattended on office desks overnight.
- **Lost Devices**: Report lost or stolen hardware immediately to security@nexushr.com to initiate instant remote device wipe.`,
      keywords: ['security', 'it security', 'passwords', 'encryption', 'clean desk', 'lost laptop', 'compliance', 'mfa', 'bitlocker'],
      priority: 8,
    },

    // 6. PAYROLL
    {
      category: 'payroll',
      title: 'Monthly Payroll Cycle, Payslip Delivery & TDS Deductions',
      content: `Key information regarding salary disbursement and tax deductions at NexusHR:
- **Salary Cycle**: The payroll cycle runs from the 1st to the last day of each month. Salaries are credited directly to employee bank accounts on the **28th of every month** (or the preceding working day if the 28th falls on a weekend/holiday).
- **Payslip Access**: Detailed payslips with earnings, deductions, and tax withholding are published on the 28th in the NexusHR portal under *My Finance -> Payslips*.
- **Tax Deductions (TDS)**: Income tax is deducted in accordance with your chosen regime (New Tax Regime vs. Old Tax Regime). Submit investment declarations (Section 80C, 80D, HRA rent receipts) by January 15th to prevent excess TDS deductions.`,
      keywords: ['payroll', 'salary', 'payslip', 'tds', 'tax', 'disbursal', 'bank account', '80c', 'hra', 'deductions'],
      priority: 10,
    },
    {
      category: 'payroll',
      title: 'Provident Fund (EPF), Gratuity & Pension Guidelines',
      content: `Statutory retirement benefits provided in compliance with Indian labor regulations:
- **Employee Provident Fund (EPF)**: 12% of your Basic Salary is deducted monthly and matched with an equal 12% employer contribution, deposited into your EPFO Universal Account Number (UAN).
- **Gratuity**: Payable to employees who have completed a minimum of 4 years and 240 days of continuous service with NexusHR, calculated as (15 * Last Drawn Basic * Years of Service) / 26.
- **Voluntary Provident Fund (VPF)**: Employees may opt to contribute additional amounts above 12% towards their EPF account during the annual tax declaration window.`,
      keywords: ['epf', 'pf', 'provident fund', 'uan', 'gratuity', 'retirement', 'pension', 'vpf'],
      priority: 7,
    },

    // 7. RECRUITMENT
    {
      category: 'recruitment',
      title: 'Employee Referral Program & Referral Bonus Matrix',
      content: `Help us build exceptional teams at NexusHR and earn generous referral bonuses:
- **Eligibility**: All full-time employees (excluding hiring managers interviewing for the specific position and HR recruiters) can submit candidate referrals.
- **Referral Bonus Matrix**:
  - Executive / Leadership (Director, VP, Principal): INR 75,000 / $1,000
  - Senior Roles (Senior Engineers, Staff Designers, Leads): INR 45,000 / $600
  - Mid & Associate Roles: INR 25,000 / $350
- **Payout Terms**: 50% paid upon the referee's joining date, and the remaining 50% paid upon successful completion of their 90-day probation period.
- **How to Submit**: Forward the candidate's CV and LinkedIn URL to careers@nexushr.com or submit via NexusHR -> Careers -> Refer a Friend.`,
      keywords: ['referral', 'referral bonus', 'hiring', 'recruitment', 'jobs', 'careers', 'bounty', 'openings'],
      priority: 8,
    },

    // 8. PERFORMANCE
    {
      category: 'performance',
      title: 'Performance Management, OKRs & Bi-Annual Appraisal Cycle',
      content: `Our performance philosophy emphasizes transparency, continuous feedback, and high achievement:
- **Quarterly OKRs**: Objectives and Key Results are agreed upon at the start of each quarter between team leads and team members, tracked transparently on NexusHR.
- **Bi-Annual Reviews**: Official appraisal reviews take place in **June (Mid-Year Check-in)** and **December (Annual Appraisal & Compensation Revision)**.
- **Rating Matrix**:
  - Exceeds Expectations (EE): Consistently outperforms targets; eligible for top-tier salary increments and stock options.
  - Meets Expectations (ME): Strong, reliable performance delivering on core quarterly goals.
  - Needs Improvement (NI): Clear 60-day Performance Improvement Plan (PIP) with weekly manager coaching.
- **Promotion Cycle**: Nominations for level promotions are reviewed semi-annually by the Senior Leadership Committee.`,
      keywords: ['performance', 'appraisal', 'okr', 'promotion', 'review', 'increment', 'pip', 'rating', 'feedback', 'bonus'],
      priority: 9,
    },
  ];

  const createdArticles = [];
  for (const art of hrArticles) {
    const doc = await HRKnowledgeBase.create({
      companyId,
      category: art.category,
      title: art.title,
      content: art.content,
      keywords: art.keywords,
      priority: art.priority,
      isActive: true,
      lastUpdated: new Date(),
      lastUpdatedBy: ceo._id,
      viewCount: Math.floor(10 + Math.random() * 50),
      helpfulCount: Math.floor(5 + Math.random() * 20),
      notHelpfulCount: 0,
    });
    createdArticles.push(doc);
  }

  console.log(`   ✅ Seeded ${createdArticles.length} rich HR Knowledge Base articles across all 8 categories.`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n' + '='.repeat(80));
  console.log('🎉 NexusHR Seeding Completed Successfully!');
  console.log('='.repeat(80));
  console.log(`🏢 Company:        ${company.name} (Code: ${company.code})`);
  console.log(`🆔 Company ID:     ${companyId}`);
  console.log(`👥 Employees:      ${empMap.size} users (Admin: anirudh@nexushr.com / password123)`);
  console.log(`🚀 Projects:       1 project (${project.name} - ${project.projectNumber})`);
  console.log(`📋 Tasks:          ${createdTasks.length} tasks across Backlog, To Do, In Progress, In Review, Completed`);
  console.log(`📚 Knowledge Base: ${createdArticles.length} articles across PTO, Holidays, Benefits, Handbook, Procedures, Payroll, Recruitment, Performance`);
  console.log('='.repeat(80));

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
  process.exit(0);
}

seedNexusHR().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
