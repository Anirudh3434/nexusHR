import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

async function seedAbaca() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));
  const Designation = mongoose.model('Designation', new mongoose.Schema({}, { strict: false }));
  const WorkShift = mongoose.model('WorkShift', new mongoose.Schema({}, { strict: false }));
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const Leave = mongoose.model('Leave', new mongoose.Schema({}, { strict: false }));
  const Holiday = mongoose.model('Holiday', new mongoose.Schema({}, { strict: false }));
  const Notice = mongoose.model('Notice', new mongoose.Schema({}, { strict: false }));
  const JobPosition = mongoose.model('JobPosition', new mongoose.Schema({}, { strict: false }));
  const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({}, { strict: false }));
  const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));

  // 1. Locate Abaca System Company
  let company = await Company.findOne({ name: /abaca/i }).lean() as any;
  if (!company) {
    console.log('Creating Abaca System company...');
    company = await Company.create({
      _id: new mongoose.Types.ObjectId('6ae09796a83eeca0f1a2e7ac'),
      name: 'Abaca System',
      code: '6VTDA8',
      email: 'info@abacasys.com',
      phone: '9812456975',
      website: 'www.abacasys.com',
      address: {
        street: '17, Sector C Road, Cyber City',
        city: 'Gurugram',
        state: 'Haryana',
        zipCode: '133010',
        country: 'India'
      },
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'PQRSX5678L',
      officeLocation: { latitude: 28.4595, longitude: 77.0266, address: 'Cyber City, Gurugram, HR' },
      geoFenceRadius: 200,
      enableGeoFencing: true,
      isActive: true,
      onboardingComplete: true,
      workHours: { start: '09:00', end: '18:00', workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      payrollCycleDate: 28,
      overtimeRate: 1.5,
    });
  }
  const companyId = company._id;
  console.log(`🏢 Company: ${company.name} (ID: ${companyId})`);

  // 2. Setup Work Shifts
  console.log('⏰ Seeding Work Shifts...');
  await WorkShift.deleteMany({ companyId });
  const shiftsData = [
    { name: 'General Day Shift', startTime: '09:00', endTime: '18:00', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], lateThreshold: 15 },
    { name: 'Flexible Dev Shift', startTime: '10:00', endTime: '19:00', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], lateThreshold: 30 },
    { name: 'Morning Early Shift', startTime: '08:00', endTime: '17:00', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], lateThreshold: 15 },
    { name: 'Night Support Shift', startTime: '18:00', endTime: '03:00', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], lateThreshold: 15 },
  ];
  const createdShifts = await WorkShift.insertMany(shiftsData.map(s => ({ ...s, companyId })));
  const defaultShift = createdShifts[0];
  const devShift = createdShifts[1];
  const nightShift = createdShifts[3];
  console.log(`   Created ${createdShifts.length} shifts.`);

  // 3. Setup Departments
  console.log('🏢 Seeding Departments...');
  await Department.deleteMany({ companyId });
  const deptsData = [
    { name: 'Executive & Management', description: 'C-Suite leadership, strategy, and corporate governance' },
    { name: 'Engineering & Technology', description: 'Core software development, architecture, and platforms' },
    { name: 'Product & Design', description: 'Product roadmap, UX/UI research, and interface design' },
    { name: 'Data & AI Research', description: 'Machine learning, large language models, and data pipelines' },
    { name: 'QA & DevOps', description: 'Automated testing, CI/CD, cloud infrastructure, and security' },
    { name: 'Human Resources & Talent', description: 'Recruitment, employee experience, and people operations' },
    { name: 'Sales & Business Development', description: 'Enterprise sales, strategic partnerships, and client growth' },
    { name: 'Finance & Operations', description: 'Accounting, financial planning, compliance, and workplace ops' },
  ];
  await Department.insertMany(deptsData.map(d => ({ ...d, companyId, isActive: true })));
  console.log(`   Created ${deptsData.length} departments.`);

  // 4. Setup Designations
  console.log('🎖️ Seeding Designations...');
  await Designation.deleteMany({ companyId });
  const designationsData = [
    { name: 'Chief Executive Officer', department: 'Executive & Management' },
    { name: 'Chief Technology Officer', department: 'Executive & Management' },
    { name: 'VP of Engineering', department: 'Engineering & Technology' },
    { name: 'VP of Product', department: 'Product & Design' },
    { name: 'Principal Architect', department: 'Engineering & Technology' },
    { name: 'Senior Full Stack Engineer', department: 'Engineering & Technology' },
    { name: 'Senior Frontend Engineer', department: 'Engineering & Technology' },
    { name: 'Senior Backend Engineer', department: 'Engineering & Technology' },
    { name: 'Mobile Application Engineer', department: 'Engineering & Technology' },
    { name: 'Associate Software Engineer', department: 'Engineering & Technology' },
    { name: 'Principal AI Scientist', department: 'Data & AI Research' },
    { name: 'Lead Machine Learning Engineer', department: 'Data & AI Research' },
    { name: 'Senior Data Scientist', department: 'Data & AI Research' },
    { name: 'Principal UI/UX Designer', department: 'Product & Design' },
    { name: 'Senior Product Manager', department: 'Product & Design' },
    { name: 'UI/UX Designer', department: 'Product & Design' },
    { name: 'Lead DevOps Engineer', department: 'QA & DevOps' },
    { name: 'Senior QA Automation Engineer', department: 'QA & DevOps' },
    { name: 'Site Reliability Engineer', department: 'QA & DevOps' },
    { name: 'Head of People & Culture', department: 'Human Resources & Talent' },
    { name: 'Senior HR Business Partner', department: 'Human Resources & Talent' },
    { name: 'Talent Acquisition Specialist', department: 'Human Resources & Talent' },
    { name: 'HR Operations Specialist', department: 'Human Resources & Talent' },
    { name: 'Director of Enterprise Sales', department: 'Sales & Business Development' },
    { name: 'Senior Account Executive', department: 'Sales & Business Development' },
    { name: 'Customer Success Lead', department: 'Sales & Business Development' },
    { name: 'Finance Controller', department: 'Finance & Operations' },
    { name: 'Senior Financial Analyst', department: 'Finance & Operations' },
    { name: 'IT Systems Administrator', department: 'QA & DevOps' },
  ];
  await Designation.insertMany(designationsData.map(d => ({ ...d, companyId, isActive: true })));
  console.log(`   Created ${designationsData.length} designations.`);

  // 5. 50 Real Employees
  console.log('👥 Seeding 50 Employees...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const rawEmployees = [
    // 1-5 Executive & Leadership
    { name: 'Anirudh Bhardwaj', email: 'anirudh@abacasys.com', role: 'admin', empId: 'ABA001', dept: 'Executive & Management', desig: 'Chief Executive Officer', salary: 320000, dob: '1996-08-14', join: '2021-04-01', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Vikram Singhania', email: 'vikram.singhania@abacasys.com', role: 'admin', empId: 'ABA002', dept: 'Executive & Management', desig: 'Chief Technology Officer', salary: 300000, dob: '1993-11-20', join: '2021-04-15', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Pooja Malhotra', email: 'pooja.malhotra@abacasys.com', role: 'hr', empId: 'ABA003', dept: 'Human Resources & Talent', desig: 'Head of People & Culture', salary: 210000, dob: '1992-06-12', join: '2021-06-01', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Aditya Verma', email: 'aditya.verma@abacasys.com', role: 'manager', empId: 'ABA004', dept: 'Engineering & Technology', desig: 'VP of Engineering', salary: 260000, dob: '1990-03-25', join: '2021-08-01', shift: devShift._id, city: 'Noida' },
    { name: 'Rohan Kapoor', email: 'rohan.kapoor@abacasys.com', role: 'manager', empId: 'ABA005', dept: 'Product & Design', desig: 'VP of Product', salary: 240000, dob: '1991-09-17', join: '2021-09-15', shift: defaultShift._id, city: 'Gurugram' },
    // 6-10 Senior Leads
    { name: 'Sneha Kulkarni', email: 'sneha.kulkarni@abacasys.com', role: 'manager', empId: 'ABA006', dept: 'Sales & Business Development', desig: 'Director of Enterprise Sales', salary: 230000, dob: '1994-01-30', join: '2022-01-10', shift: defaultShift._id, city: 'Mumbai' },
    { name: 'Rajesh Nair', email: 'rajesh.nair@abacasys.com', role: 'manager', empId: 'ABA007', dept: 'Finance & Operations', desig: 'Finance Controller', salary: 200000, dob: '1989-12-05', join: '2022-02-01', shift: defaultShift._id, city: 'Bengaluru' },
    { name: 'Dr. Aarav Bhattacharya', email: 'aarav.bhattacharya@abacasys.com', role: 'manager', empId: 'ABA008', dept: 'Data & AI Research', desig: 'Principal AI Scientist', salary: 280000, dob: '1988-07-22', join: '2022-03-15', shift: devShift._id, city: 'Delhi' },
    { name: 'Kavita Joshi', email: 'kavita.joshi@abacasys.com', role: 'manager', empId: 'ABA009', dept: 'QA & DevOps', desig: 'Lead DevOps Engineer', salary: 220000, dob: '1993-04-18', join: '2022-04-01', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Siddharth Mehta', email: 'siddharth.mehta@abacasys.com', role: 'manager', empId: 'ABA010', dept: 'QA & DevOps', desig: 'Senior QA Automation Engineer', salary: 180000, dob: '1995-10-10', join: '2022-05-15', shift: defaultShift._id, city: 'Noida' },
    // 11-15 HR & Product Leads
    { name: 'Meera Iyer', email: 'meera.iyer@abacasys.com', role: 'employee', empId: 'ABA011', dept: 'Product & Design', desig: 'Principal UI/UX Designer', salary: 195000, dob: '1994-08-08', join: '2022-06-01', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Gaurav Taneja', email: 'gaurav.taneja@abacasys.com', role: 'hr', empId: 'ABA012', dept: 'Human Resources & Talent', desig: 'Senior HR Business Partner', salary: 150000, dob: '1995-02-14', join: '2022-07-10', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Neha Sharma', email: 'neha.sharma@abacasys.com', role: 'hr', empId: 'ABA013', dept: 'Human Resources & Talent', desig: 'Talent Acquisition Specialist', salary: 125000, dob: '1996-11-28', join: '2022-09-01', shift: defaultShift._id, city: 'Faridabad' },
    { name: 'Kunal Deshmukh', email: 'kunal.deshmukh@abacasys.com', role: 'employee', empId: 'ABA014', dept: 'Engineering & Technology', desig: 'Senior Backend Engineer', salary: 185000, dob: '1992-05-19', join: '2022-10-01', shift: devShift._id, city: 'Pune' },
    { name: 'Ishaan Saxena', email: 'ishaan.saxena@abacasys.com', role: 'employee', empId: 'ABA015', dept: 'Engineering & Technology', desig: 'Senior Full Stack Engineer', salary: 180000, dob: '1995-12-03', join: '2022-11-15', shift: devShift._id, city: 'Gurugram' },
    // 16-20 Core Tech & AI
    { name: 'Priya Nambiar', email: 'priya.nambiar@abacasys.com', role: 'employee', empId: 'ABA016', dept: 'Engineering & Technology', desig: 'Senior Frontend Engineer', salary: 175000, dob: '1996-03-11', join: '2023-01-05', shift: defaultShift._id, city: 'Kochi' },
    { name: 'Arjun Reddy', email: 'arjun.reddy@abacasys.com', role: 'employee', empId: 'ABA017', dept: 'Engineering & Technology', desig: 'Mobile Application Engineer', salary: 165000, dob: '1994-09-24', join: '2023-02-01', shift: devShift._id, city: 'Hyderabad' },
    { name: 'Ananya Sen', email: 'ananya.sen@abacasys.com', role: 'employee', empId: 'ABA018', dept: 'Data & AI Research', desig: 'Lead Machine Learning Engineer', salary: 190000, dob: '1995-04-15', join: '2023-03-01', shift: devShift._id, city: 'Kolkata' },
    { name: 'Varun Aggarwal', email: 'varun.aggarwal@abacasys.com', role: 'employee', empId: 'ABA019', dept: 'QA & DevOps', desig: 'Site Reliability Engineer', salary: 160000, dob: '1993-07-09', join: '2023-04-10', shift: nightShift._id, city: 'Chandigarh' },
    { name: 'Divya Menon', email: 'divya.menon@abacasys.com', role: 'employee', empId: 'ABA020', dept: 'Product & Design', desig: 'Senior Product Manager', salary: 190000, dob: '1993-10-18', join: '2023-05-01', shift: defaultShift._id, city: 'Bengaluru' },
    // 21-25 Sales & Ops
    { name: 'Manish Tiwari', email: 'manish.tiwari@abacasys.com', role: 'employee', empId: 'ABA021', dept: 'Sales & Business Development', desig: 'Senior Account Executive', salary: 140000, dob: '1994-06-25', join: '2023-06-15', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Shreya Pillai', email: 'shreya.pillai@abacasys.com', role: 'employee', empId: 'ABA022', dept: 'Sales & Business Development', desig: 'Customer Success Lead', salary: 145000, dob: '1996-01-14', join: '2023-07-01', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Ritu Ganguly', email: 'ritu.ganguly@abacasys.com', role: 'employee', empId: 'ABA023', dept: 'Finance & Operations', desig: 'Senior Financial Analyst', salary: 135000, dob: '1995-08-30', join: '2023-08-10', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Tanmay Rastogi', email: 'tanmay.rastogi@abacasys.com', role: 'employee', empId: 'ABA024', dept: 'Engineering & Technology', desig: 'Senior Backend Engineer', salary: 155000, dob: '1997-02-21', join: '2023-09-01', shift: devShift._id, city: 'Noida' },
    { name: 'Deepika Chawla', email: 'deepika.chawla@abacasys.com', role: 'employee', empId: 'ABA025', dept: 'Engineering & Technology', desig: 'Senior Frontend Engineer', salary: 150000, dob: '1997-11-04', join: '2023-10-15', shift: defaultShift._id, city: 'Gurugram' },
    // 26-30 Tech & Design
    { name: 'Karan Bansal', email: 'karan.bansal@abacasys.com', role: 'employee', empId: 'ABA026', dept: 'Engineering & Technology', desig: 'Senior Full Stack Engineer', salary: 145000, dob: '1996-05-17', join: '2023-11-01', shift: devShift._id, city: 'Delhi' },
    { name: 'Aayushi Roy', email: 'aayushi.roy@abacasys.com', role: 'employee', empId: 'ABA027', dept: 'Product & Design', desig: 'UI/UX Designer', salary: 120000, dob: '1998-03-29', join: '2023-12-01', shift: defaultShift._id, city: 'Kolkata' },
    { name: 'Pranav Mukherjee', email: 'pranav.mukherjee@abacasys.com', role: 'employee', empId: 'ABA028', dept: 'Data & AI Research', desig: 'Senior Data Scientist', salary: 155000, dob: '1996-12-19', join: '2024-01-10', shift: devShift._id, city: 'Delhi' },
    { name: 'Naveen Choudhary', email: 'naveen.choudhary@abacasys.com', role: 'employee', empId: 'ABA029', dept: 'QA & DevOps', desig: 'Senior QA Automation Engineer', salary: 130000, dob: '1995-09-05', join: '2024-02-01', shift: defaultShift._id, city: 'Jaipur' },
    { name: 'Sanya Mirchandani', email: 'sanya.mirchandani@abacasys.com', role: 'employee', empId: 'ABA030', dept: 'Sales & Business Development', desig: 'Senior Account Executive', salary: 135000, dob: '1997-07-12', join: '2024-02-15', shift: defaultShift._id, city: 'Mumbai' },
    // 31-35 Engineers & Specialists
    { name: 'Harsh Vardhan', email: 'harsh.vardhan@abacasys.com', role: 'employee', empId: 'ABA031', dept: 'QA & DevOps', desig: 'Lead DevOps Engineer', salary: 140000, dob: '1996-04-03', join: '2024-03-01', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Bhavna Rajput', email: 'bhavna.rajput@abacasys.com', role: 'hr', empId: 'ABA032', dept: 'Human Resources & Talent', desig: 'HR Operations Specialist', salary: 95000, dob: '1998-10-25', join: '2024-03-15', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Mohit Khurana', email: 'mohit.khurana@abacasys.com', role: 'employee', empId: 'ABA033', dept: 'Engineering & Technology', desig: 'Mobile Application Engineer', salary: 130000, dob: '1997-08-16', join: '2024-04-01', shift: devShift._id, city: 'Faridabad' },
    { name: 'Ritika Bose', email: 'ritika.bose@abacasys.com', role: 'employee', empId: 'ABA034', dept: 'Product & Design', desig: 'UI/UX Designer', salary: 110000, dob: '1999-01-20', join: '2024-04-15', shift: defaultShift._id, city: 'Noida' },
    { name: 'Alok Mathur', email: 'alok.mathur@abacasys.com', role: 'employee', empId: 'ABA035', dept: 'Engineering & Technology', desig: 'Senior Backend Engineer', salary: 135000, dob: '1996-06-08', join: '2024-05-01', shift: devShift._id, city: 'Lucknow' },
    // 36-40 Developers & Analysts
    { name: 'Swati Tripathi', email: 'swati.tripathi@abacasys.com', role: 'employee', empId: 'ABA036', dept: 'Engineering & Technology', desig: 'Senior Frontend Engineer', salary: 125000, dob: '1998-09-14', join: '2024-05-15', shift: defaultShift._id, city: 'Gurugram' },
    { name: 'Abhishek Ghosh', email: 'abhishek.ghosh@abacasys.com', role: 'employee', empId: 'ABA037', dept: 'Data & AI Research', desig: 'Lead Machine Learning Engineer', salary: 140000, dob: '1997-03-31', join: '2024-06-01', shift: devShift._id, city: 'Kolkata' },
    { name: 'Pallavi Hegde', email: 'pallavi.hegde@abacasys.com', role: 'employee', empId: 'ABA038', dept: 'QA & DevOps', desig: 'Senior QA Automation Engineer', salary: 115000, dob: '1998-12-11', join: '2024-06-15', shift: defaultShift._id, city: 'Bengaluru' },
    { name: 'Sumit Singhal', email: 'sumit.singhal@abacasys.com', role: 'employee', empId: 'ABA039', dept: 'Sales & Business Development', desig: 'Senior Account Executive', salary: 110000, dob: '1997-10-05', join: '2024-07-01', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Tanya Grover', email: 'tanya.grover@abacasys.com', role: 'employee', empId: 'ABA040', dept: 'Sales & Business Development', desig: 'Customer Success Lead', salary: 105000, dob: '1999-05-23', join: '2024-07-15', shift: defaultShift._id, city: 'Gurugram' },
    // 41-45 Ops & Associates
    { name: 'Nikhil Vohra', email: 'nikhil.vohra@abacasys.com', role: 'employee', empId: 'ABA041', dept: 'QA & DevOps', desig: 'IT Systems Administrator', salary: 110000, dob: '1995-11-19', join: '2024-08-01', shift: defaultShift._id, city: 'Delhi' },
    { name: 'Simran Kaur', email: 'simran.kaur@abacasys.com', role: 'employee', empId: 'ABA042', dept: 'Engineering & Technology', desig: 'Associate Software Engineer', salary: 75000, dob: '2001-02-14', join: '2024-08-15', shift: devShift._id, city: 'Amritsar' },
    { name: 'Akshat Pandya', email: 'akshat.pandya@abacasys.com', role: 'employee', empId: 'ABA043', dept: 'Engineering & Technology', desig: 'Associate Software Engineer', salary: 75000, dob: '2000-08-28', join: '2024-09-01', shift: devShift._id, city: 'Ahmedabad' },
    { name: 'Anjali Rawat', email: 'anjali.rawat@abacasys.com', role: 'employee', empId: 'ABA044', dept: 'Product & Design', desig: 'UI/UX Designer', salary: 70000, dob: '2001-04-10', join: '2024-09-15', shift: defaultShift._id, city: 'Dehradun' },
    { name: 'Rahul Bajaj', email: 'rahul.bajaj@abacasys.com', role: 'employee', empId: 'ABA045', dept: 'QA & DevOps', desig: 'Senior QA Automation Engineer', salary: 70000, dob: '2000-11-02', join: '2024-10-01', shift: defaultShift._id, city: 'Chandigarh' },
    // 46-50 Support & Growth
    { name: 'Meenakshi Sundaram', email: 'meenakshi.sundaram@abacasys.com', role: 'employee', empId: 'ABA046', dept: 'Finance & Operations', desig: 'Senior Financial Analyst', salary: 85000, dob: '1999-07-16', join: '2024-10-15', shift: defaultShift._id, city: 'Chennai' },
    { name: 'Yashwant Soni', email: 'yashwant.soni@abacasys.com', role: 'employee', empId: 'ABA047', dept: 'Engineering & Technology', desig: 'Associate Software Engineer', salary: 80000, dob: '2000-01-27', join: '2024-11-01', shift: defaultShift._id, city: 'Jaipur' },
    { name: 'Kriti Bhargava', email: 'kriti.bhargava@abacasys.com', role: 'employee', empId: 'ABA048', dept: 'Sales & Business Development', desig: 'Customer Success Lead', salary: 80000, dob: '2001-09-08', join: '2024-11-15', shift: defaultShift._id, city: 'Noida' },
    { name: 'Girish Chandran', email: 'girish.chandran@abacasys.com', role: 'employee', empId: 'ABA049', dept: 'Engineering & Technology', desig: 'Associate Software Engineer', salary: 65000, dob: '2002-03-05', join: '2024-12-01', shift: devShift._id, city: 'Thiruvananthapuram' },
    { name: 'Komal Mahajan', email: 'komal.mahajan@abacasys.com', role: 'hr', empId: 'ABA050', dept: 'Human Resources & Talent', desig: 'HR Operations Specialist', salary: 75000, dob: '2001-06-19', join: '2025-01-05', shift: defaultShift._id, city: 'Gurugram' },
  ];

  const seededUsers: any[] = [];
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
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`,
          address: { street: 'Main Road', city: emp.city, state: 'Haryana', country: 'India', zipCode: '122002' },
          bio: `${emp.desig} at Abaca System. Passionate about enterprise cloud technology, AI solutions, and digital transformation.`,
          isActive: true,
          leaveBalances: {
            annual: { allocated: 18, used: Math.floor(Math.random() * 5), remaining: 14 },
            casual: { allocated: 12, used: Math.floor(Math.random() * 3), remaining: 9 },
            sick: { allocated: 10, used: Math.floor(Math.random() * 2), remaining: 8 }
          }
        }
      },
      { upsert: true, new: true }
    );
    seededUsers.push(doc);
  }
  console.log(`   Seeded ${seededUsers.length} employees with password123.`);

  // 6. Setup Projects
  console.log('🚀 Seeding Flagship Projects...');
  await Project.deleteMany({ companyId });
  const projectsData = [
    {
      projectNumber: 'PRJ-2601',
      name: 'Abaca Cloud Enterprise Core',
      description: 'Distributed microservices backend handling multi-tenant enterprise data and authorization.',
      status: 'active',
      priority: 'critical',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-06-30'),
      budget: { total: 4500000, currency: 'INR', spent: 1800000 },
      client: { name: 'FinGlobal Corp', email: 'partners@finglobal.com' },
      members: [
        { employeeId: seededUsers[1]._id, role: 'project_manager', joinedAt: new Date('2024-01-15'), allocationPercentage: 50 },
        { employeeId: seededUsers[3]._id, role: 'team_lead', joinedAt: new Date('2024-01-15'), allocationPercentage: 100 },
        { employeeId: seededUsers[13]._id, role: 'developer', joinedAt: new Date('2024-01-15'), allocationPercentage: 100 },
        { employeeId: seededUsers[14]._id, role: 'developer', joinedAt: new Date('2024-01-15'), allocationPercentage: 100 },
        { employeeId: seededUsers[8]._id, role: 'other', joinedAt: new Date('2024-01-15'), allocationPercentage: 40 },
      ]
    },
    {
      projectNumber: 'PRJ-2602',
      name: 'Nexus AI Copilot & Automation Suite',
      description: 'Generative AI workflows and context-aware agents for business intelligence and document analysis.',
      status: 'active',
      priority: 'high',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-04-30'),
      budget: { total: 3200000, currency: 'INR', spent: 1200000 },
      client: { name: 'Internal R&D', email: 'rd@abacasys.com' },
      members: [
        { employeeId: seededUsers[7]._id, role: 'team_lead', joinedAt: new Date('2024-03-01'), allocationPercentage: 100 },
        { employeeId: seededUsers[17]._id, role: 'developer', joinedAt: new Date('2024-03-01'), allocationPercentage: 100 },
        { employeeId: seededUsers[27]._id, role: 'developer', joinedAt: new Date('2024-03-01'), allocationPercentage: 80 },
        { employeeId: seededUsers[36]._id, role: 'developer', joinedAt: new Date('2024-03-01'), allocationPercentage: 80 },
      ]
    },
    {
      projectNumber: 'PRJ-2603',
      name: 'FinFlow Payment Gateway Orchestrator',
      description: 'High-throughput payment gateway orchestrator with automatic fallback and compliance tracking.',
      status: 'active',
      priority: 'high',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-05-15'),
      budget: { total: 2800000, currency: 'INR', spent: 950000 },
      client: { name: 'PaySwift India', email: 'tech@payswift.in' },
      members: [
        { employeeId: seededUsers[3]._id, role: 'project_manager', joinedAt: new Date('2024-02-01'), allocationPercentage: 40 },
        { employeeId: seededUsers[23]._id, role: 'developer', joinedAt: new Date('2024-02-01'), allocationPercentage: 100 },
        { employeeId: seededUsers[15]._id, role: 'developer', joinedAt: new Date('2024-02-01'), allocationPercentage: 100 },
        { employeeId: seededUsers[9]._id, role: 'tester', joinedAt: new Date('2024-02-01'), allocationPercentage: 50 },
      ]
    },
    {
      projectNumber: 'PRJ-2604',
      name: 'OmniClient Cross-Platform App 3.0',
      description: 'Flutter-based modern mobile experience with offline sync, biometric login, and push notifications.',
      status: 'active',
      priority: 'medium',
      startDate: new Date('2024-04-10'),
      endDate: new Date('2025-07-20'),
      budget: { total: 1900000, currency: 'INR', spent: 600000 },
      client: { name: 'RetailSync Asia', email: 'product@retailsync.asia' },
      members: [
        { employeeId: seededUsers[16]._id, role: 'team_lead', joinedAt: new Date('2024-04-10'), allocationPercentage: 100 },
        { employeeId: seededUsers[32]._id, role: 'developer', joinedAt: new Date('2024-04-10'), allocationPercentage: 100 },
        { employeeId: seededUsers[10]._id, role: 'designer', joinedAt: new Date('2024-04-10'), allocationPercentage: 50 },
      ]
    },
    {
      projectNumber: 'PRJ-2605',
      name: 'Internal NexusHR Worksuite Integration',
      description: 'Company-wide automated workforce management, attendance biometrics, and analytics hub.',
      status: 'completed',
      priority: 'medium',
      startDate: new Date('2023-11-01'),
      endDate: new Date('2024-08-30'),
      budget: { total: 1500000, currency: 'INR', spent: 1400000 },
      client: { name: 'Abaca System HR', email: 'hr@abacasys.com' },
      members: [
        { employeeId: seededUsers[2]._id, role: 'project_manager', joinedAt: new Date('2023-11-01'), allocationPercentage: 50 },
        { employeeId: seededUsers[14]._id, role: 'developer', joinedAt: new Date('2023-11-01'), allocationPercentage: 80 },
      ]
    }
  ];

  const createdProjects = await Project.insertMany(projectsData.map(p => ({
    ...p,
    companyId,
    boards: [
      {
        id: 'board-1',
        name: 'Sprint Board',
        type: 'kanban',
        defaultView: 'board',
        columns: [
          { id: 'col-1', name: 'Backlog', status: 'backlog', position: 0 },
          { id: 'col-2', name: 'To Do', status: 'to_do', position: 1 },
          { id: 'col-3', name: 'In Progress', status: 'in_progress', position: 2 },
          { id: 'col-4', name: 'In Review', status: 'in_review', position: 3 },
          { id: 'col-5', name: 'Completed', status: 'completed', position: 4 },
        ]
      }
    ]
  })));
  console.log(`   Created ${createdProjects.length} projects.`);

  // 7. Setup Tasks
  console.log('📌 Seeding Project Tasks...');
  await Task.deleteMany({ companyId });
  const tasksData = [
    { title: 'Architect Kafka event streaming for real-time order sync', project: createdProjects[0], assignee: seededUsers[13]._id, status: 'completed', priority: 'critical', type: 'story', sp: 8 },
    { title: 'Implement RBAC middleware for multi-tenant organizations', project: createdProjects[0], assignee: seededUsers[14]._id, status: 'in_progress', priority: 'high', type: 'task', sp: 5 },
    { title: 'Database connection pool optimization & query profiling', project: createdProjects[0], assignee: seededUsers[13]._id, status: 'in_review', priority: 'high', type: 'improvement', sp: 5 },
    { title: 'Write comprehensive integration tests for auth token refresh', project: createdProjects[0], assignee: seededUsers[9]._id, status: 'to_do', priority: 'medium', type: 'task', sp: 3 },
    { title: 'Fine-tune Llama 3 8B model on company knowledge base', project: createdProjects[1], assignee: seededUsers[17]._id, status: 'in_progress', priority: 'critical', type: 'story', sp: 13 },
    { title: 'Build streaming chat completions SSE endpoint', project: createdProjects[1], assignee: seededUsers[36]._id, status: 'completed', priority: 'high', type: 'task', sp: 5 },
    { title: 'Implement vector database similarity search with Pinecone', project: createdProjects[1], assignee: seededUsers[27]._id, status: 'in_progress', priority: 'high', type: 'task', sp: 8 },
    { title: 'Integrate Razorpay & Stripe webhooks with idempotent locks', project: createdProjects[2], assignee: seededUsers[23]._id, status: 'completed', priority: 'critical', type: 'story', sp: 8 },
    { title: 'Design payment retry circuit breaker with Redis', project: createdProjects[2], assignee: seededUsers[14]._id, status: 'in_progress', priority: 'high', type: 'task', sp: 5 },
    { title: 'Build reconcilation export report for monthly accounting', project: createdProjects[2], assignee: seededUsers[22]._id, status: 'to_do', priority: 'medium', type: 'task', sp: 3 },
    { title: 'Implement biometric FaceID & Fingerprint lock in Flutter', project: createdProjects[3], assignee: seededUsers[16]._id, status: 'in_review', priority: 'high', type: 'story', sp: 5 },
    { title: 'Optimize offline database syncing with Isar DB engine', project: createdProjects[3], assignee: seededUsers[32]._id, status: 'in_progress', priority: 'medium', type: 'task', sp: 5 },
    { title: 'Redesign onboarding carousel screens for iOS 18', project: createdProjects[3], assignee: seededUsers[10]._id, status: 'completed', priority: 'low', type: 'task', sp: 2 },
    { title: 'Configure auto-scaling Kubernetes HPA cluster on AWS EKS', project: createdProjects[0], assignee: seededUsers[8]._id, status: 'completed', priority: 'high', type: 'task', sp: 5 },
    { title: 'Implement Prometheus & Grafana alerting metrics for 5xx spikes', project: createdProjects[0], assignee: seededUsers[18]._id, status: 'in_progress', priority: 'medium', type: 'task', sp: 3 },
  ];

  let taskCount = 101;
  const createdTasks = await Task.insertMany(tasksData.map(t => ({
    companyId,
    taskNumber: `TSK2607${taskCount++}`,
    title: t.title,
    description: `${t.title}. Ensure adherence to Abaca code standards, clean architecture, and test coverage above 85%.`,
    status: t.status,
    priority: t.priority,
    taskType: t.type,
    projectId: t.project._id,
    assignedTo: [t.assignee],
    assignedBy: seededUsers[0]._id,
    dueDate: new Date(Date.now() + 7 * 86400000),
    storyPoints: t.sp,
    progressPercentage: t.status === 'completed' ? 100 : t.status === 'in_review' ? 80 : t.status === 'in_progress' ? 45 : 0,
    tags: ['abaca-core', 'sprint-active']
  })));
  console.log(`   Created ${createdTasks.length} project tasks.`);

  // 8. Setup 14 Days of Realistic Attendance History + Today
  console.log('📅 Seeding 14 Days of Attendance History...');
  await Attendance.deleteMany({ companyId });

  const attendanceBatch: any[] = [];
  const now = new Date();

  // Past 14 weekdays
  let dayOffset = 14;
  while (dayOffset >= 0) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - dayOffset);
    const dayOfWeek = targetDate.getDay();

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = targetDate.toISOString().slice(0, 10);
      const isToday = dayOffset === 0;

      for (let i = 0; i < seededUsers.length; i++) {
        const emp = seededUsers[i];
        
        // Random attendance distribution: 92% present, 5% late, 3% leave/half day
        const rand = Math.random();
        let status = 'Present';
        let isLate = false;
        let lateMinutes = 0;
        let checkInTime = '08:55';
        let checkOutTime = isToday ? undefined : '18:05';

        if (rand > 0.95) {
          status = 'Half Day';
          checkInTime = '09:10';
          checkOutTime = isToday ? undefined : '13:30';
        } else if (rand > 0.88) {
          status = 'Late';
          isLate = true;
          lateMinutes = Math.floor(16 + Math.random() * 25);
          checkInTime = `09:${lateMinutes < 10 ? '0' + lateMinutes : lateMinutes}`;
          checkOutTime = isToday ? undefined : '18:15';
        } else {
          status = 'Present';
          const mins = Math.floor(45 + Math.random() * 14); // 08:45 to 08:59
          checkInTime = `08:${mins}`;
        }

        attendanceBatch.push({
          employeeId: emp._id,
          companyId,
          date: targetDate,
          checkIn: {
            time: checkInTime,
            ip: '103.21.124.89',
            location: { lat: 28.4595, lng: 77.0266 }
          },
          checkOut: checkOutTime ? {
            time: checkOutTime,
            ip: '103.21.124.89',
            location: { lat: 28.4595, lng: 77.0266 }
          } : undefined,
          totalHours: isToday ? 4.5 : status === 'Half Day' ? 4 : 8.5,
          status,
          isLate,
          lateMinutes,
          shiftStartTime: '09:00',
          shiftEndTime: '18:00',
          workShiftId: emp.workShiftId || defaultShift._id
        });
      }
    }
    dayOffset--;
  }

  await Attendance.insertMany(attendanceBatch);
  console.log(`   Seeded ${attendanceBatch.length} attendance records.`);

  // 9. Setup Leave Requests
  console.log('🌴 Seeding Leave Requests...');
  await Leave.deleteMany({ companyId });
  const leavesData = [
    { employee: seededUsers[15], type: 'Casual', days: 2, reason: 'Family celebration in hometown', status: 'Approved', start: new Date(Date.now() + 3 * 86400000), end: new Date(Date.now() + 5 * 86400000) },
    { employee: seededUsers[18], type: 'Sick', days: 1, reason: 'Seasonal viral fever', status: 'Approved', start: new Date(Date.now() - 4 * 86400000), end: new Date(Date.now() - 3 * 86400000) },
    { employee: seededUsers[24], type: 'Annual', days: 4, reason: 'Annual vacation with parents', status: 'Pending', start: new Date(Date.now() + 10 * 86400000), end: new Date(Date.now() + 14 * 86400000) },
    { employee: seededUsers[33], type: 'Casual', days: 1, reason: 'Personal work at government office', status: 'Pending', start: new Date(Date.now() + 2 * 86400000), end: new Date(Date.now() + 3 * 86400000) },
    { employee: seededUsers[41], type: 'Sick', days: 2, reason: 'Doctor prescribed rest', status: 'Approved', start: new Date(Date.now() - 10 * 86400000), end: new Date(Date.now() - 8 * 86400000) },
  ];
  await Leave.insertMany(leavesData.map(l => ({
    companyId,
    employeeId: l.employee._id,
    type: l.type,
    startDate: l.start,
    endDate: l.end,
    totalDays: l.days,
    reason: l.reason,
    status: l.status,
    approvedBy: seededUsers[2]._id, // Pooja (HR Head)
    comment: l.status === 'Approved' ? 'Approved by HR. Have a good time!' : undefined
  })));
  console.log(`   Created ${leavesData.length} leave records.`);

  // 10. Setup Holidays
  console.log('🎉 Seeding Holidays...');
  await Holiday.deleteMany({ companyId });
  const holidaysData = [
    { name: 'Diwali (Deepavali)', date: new Date('2026-11-08'), type: 'National', description: 'Festival of Lights celebration' },
    { name: 'Goverdhan Puja', date: new Date('2026-11-09'), type: 'Company', description: 'Post-Diwali festivities' },
    { name: 'Guru Nanak Jayanti', date: new Date('2026-11-24'), type: 'National', description: 'Prakash Utsav' },
    { name: 'Christmas Day', date: new Date('2026-12-25'), type: 'National', description: 'Christmas celebration' },
    { name: 'New Year Day', date: new Date('2027-01-01'), type: 'Company', description: 'Welcome 2027' },
    { name: 'Republic Day', date: new Date('2027-01-26'), type: 'National', description: 'National Republic Day' },
    { name: 'Holi Festival', date: new Date('2027-03-22'), type: 'National', description: 'Festival of colors' },
  ];
  await Holiday.insertMany(holidaysData.map(h => ({ ...h, companyId, createdBy: seededUsers[0]._id, isActive: true })));
  console.log(`   Created ${holidaysData.length} upcoming holidays.`);

  // 11. Setup Notices / Announcements
  console.log('📢 Seeding Company Notices...');
  await Notice.deleteMany({ companyId });
  const noticesData = [
    {
      title: 'Q4 All-Hands Town Hall Meeting',
      content: 'Join us this Friday at 4:30 PM in the Main Town Hall area and online via Google Meet. Leadership will share Q4 roadmaps, enterprise milestones, and celebrate key employee achievements.',
      category: 'General',
      priority: 'High',
      postedBy: seededUsers[0]._id, // Anirudh (CEO)
      isActive: true
    },
    {
      title: 'Annual Health & Wellness Camp at Gurugram Office',
      content: 'Abaca People Team has partnered with Max Healthcare to provide full health checkups, dental screening, and ergonomic consultations on 15th November. Registration link is in your inbox.',
      category: 'Event',
      priority: 'Medium',
      postedBy: seededUsers[2]._id, // Pooja (HR Head)
      isActive: true
    },
    {
      title: 'AI Learning Allowance & AWS/GCP Certification Reimbursement',
      content: 'Employees pursuing certifications in Cloud Architecture, GenAI, or Kubernetes are eligible for 100% exam fee reimbursement and a ₹25,000 learning stipend upon successful completion.',
      category: 'Policy',
      priority: 'High',
      postedBy: seededUsers[1]._id, // Vikram (CTO)
      isActive: true
    },
    {
      title: 'Diwali Gift Hamper Distribution & Office Celebration',
      content: 'Diwali celebrations will take place on November 6th with traditional attire, desk decoration contests, and gift hamper distribution starting at 3:00 PM.',
      category: 'Holiday',
      priority: 'Medium',
      postedBy: seededUsers[2]._id,
      isActive: true
    }
  ];
  await Notice.insertMany(noticesData.map(n => ({ ...n, companyId })));
  console.log(`   Created ${noticesData.length} company notices.`);

  // 12. Setup Job Requisitions & Candidate Applications
  console.log('💼 Seeding Job Positions & Candidate Pipeline...');
  await JobPosition.deleteMany({ companyId });
  const jobsData = [
    {
      jobId: 'AB0001',
      title: 'Senior Full Stack Engineer (Next.js / Node.js)',
      department: 'Engineering & Technology',
      designation: 'Senior Full Stack Engineer',
      location: 'Gurugram (Hybrid)',
      description: 'We are seeking an experienced Full Stack engineer with mastery of TypeScript, Next.js, distributed databases, and high-throughput microservices.',
      requirements: ['4+ years building full stack web apps with Next.js and Node.js', 'Strong proficiency in TypeScript, MongoDB/PostgreSQL, and Docker', 'Experience with Kafka or Redis pub/sub'],
      responsibilities: ['Architect scalable APIs', 'Lead sprint reviews and mentor junior developers', 'Ensure 99.9% uptime across production endpoints'],
      experienceRequired: '4-7 Years',
      salaryRange: '₹18,00,000 - ₹28,00,000 PA',
      employmentType: 'Full-time',
      openings: 3,
      status: 'Active',
      postedAt: new Date(Date.now() - 14 * 86400000)
    },
    {
      jobId: 'AB0002',
      title: 'Lead AI & Machine Learning Researcher',
      department: 'Data & AI Research',
      designation: 'Lead Machine Learning Engineer',
      location: 'Gurugram / Remote',
      description: 'Lead our next-generation LLM fine-tuning, RAG pipelines, and automated reasoning engines.',
      requirements: ['M.S. or B.Tech in CS/AI or equivalent experience', 'Deep experience with PyTorch, LangChain, vLLM, and HuggingFace transformers', 'Proven track record deploying LLMs to production'],
      responsibilities: ['Lead AI research initiatives', 'Optimize inference latency and quantization for private models', 'Collaborate with Product teams'],
      experienceRequired: '5-9 Years',
      salaryRange: '₹24,00,000 - ₹38,00,000 PA',
      employmentType: 'Full-time',
      openings: 2,
      status: 'Active',
      postedAt: new Date(Date.now() - 20 * 86400000)
    },
    {
      jobId: 'AB0003',
      title: 'Senior Product Designer (UI / UX)',
      department: 'Product & Design',
      designation: 'UI/UX Designer',
      location: 'Gurugram (Hybrid)',
      description: 'Craft intuitive design systems, micro-interactions, and high-fidelity enterprise workflows in Figma.',
      requirements: ['3+ years in B2B SaaS or enterprise web applications', 'Expertise in Figma tokens, auto-layout, and interactive prototyping', 'Strong portfolio showcasing product design depth'],
      responsibilities: ['Maintain Harbor & Pine design system', 'Conduct user interviews and usability testing', 'Collaborate directly with frontend engineers'],
      experienceRequired: '3-6 Years',
      salaryRange: '₹14,00,000 - ₹22,00,000 PA',
      employmentType: 'Full-time',
      openings: 1,
      status: 'Active',
      postedAt: new Date(Date.now() - 10 * 86400000)
    },
    {
      jobId: 'AB0004',
      title: 'DevOps & Site Reliability Engineer',
      department: 'QA & DevOps',
      designation: 'Site Reliability Engineer',
      location: 'Gurugram / Delhi NCR',
      description: 'Build enterprise infrastructure with Terraform, Kubernetes, AWS EKS, and GitOps pipelines.',
      requirements: ['3+ years managing production Kubernetes and cloud infra', 'Strong scripting skills in Bash/Python/Go', 'Solid understanding of CI/CD, Istio, and zero-downtime rollouts'],
      responsibilities: ['Automate AWS cloud infrastructure', 'Manage multi-region disaster recovery', 'Maintain 99.95% SLOs'],
      experienceRequired: '3-6 Years',
      salaryRange: '₹16,00,000 - ₹25,00,000 PA',
      employmentType: 'Full-time',
      openings: 2,
      status: 'Active',
      postedAt: new Date(Date.now() - 7 * 86400000)
    }
  ];
  const createdJobs = await JobPosition.insertMany(jobsData.map(j => ({ ...j, companyId })));
  console.log(`   Created ${createdJobs.length} open job positions.`);

  // 13. Candidate Applications
  await JobApplication.deleteMany({ companyId });
  const candidatesData = [
    { name: 'Devendra Patil', email: 'devendra.patil94@gmail.com', job: createdJobs[0], status: 'interview', source: 'website', exp: '5.5 Years', pos: 'Senior Full Stack Engineer', phone: '+91 9823411209' },
    { name: 'Aakanksha Roy', email: 'aakanksha.roy@outlook.com', job: createdJobs[1], status: 'shortlisted', source: 'email', exp: '6 Years', pos: 'Lead AI & Machine Learning Researcher', phone: '+91 9910452391' },
    { name: 'Rahul Singla', email: 'rahul.singla.dev@gmail.com', job: createdJobs[0], status: 'considered', source: 'website', exp: '4 Years', pos: 'Senior Full Stack Engineer', phone: '+91 9811094321' },
    { name: 'Tanvi Maheshwari', email: 'tanvi.ux@gmail.com', job: createdJobs[2], status: 'interview', source: 'website', exp: '4.5 Years', pos: 'Senior Product Designer (UI / UX)', phone: '+91 9712034912' },
    { name: 'Gaurav Khandelwal', email: 'gkhandelwal.cloud@yahoo.com', job: createdJobs[3], status: 'new', source: 'email', exp: '5 Years', pos: 'DevOps & Site Reliability Engineer', phone: '+91 9987612345' },
    { name: 'Nandini Das', email: 'nandini.das.ai@gmail.com', job: createdJobs[1], status: 'under_review', source: 'email', exp: '4 Years', pos: 'Lead AI & Machine Learning Researcher', phone: '+91 9876543210' },
  ];
  await JobApplication.insertMany(candidatesData.map((c, i) => ({
    companyId,
    emailMessageId: `abaca-inbound-${Date.now()}-${i}@mail.abacasys.com`,
    threadId: `thread-aba-${i}`,
    fromEmail: c.email,
    fromName: c.name,
    subject: `Application for ${c.job.jobId} - ${c.name}`,
    body: `Dear Hiring Team,\n\nI am thrilled to apply for the position of ${c.pos} (Job ID: ${c.job.jobId}) at Abaca System. I have attached my resume highlighting ${c.exp} of production experience.\n\nBest regards,\n${c.name}`,
    bodyText: `Application for ${c.job.jobId} from ${c.name}`,
    candidateName: c.name,
    candidateEmail: c.email,
    candidatePhone: c.phone,
    jobId: c.job.jobId,
    appliedPosition: c.pos,
    experience: c.exp,
    status: c.status,
    source: c.source,
    receivedAt: new Date(Date.now() - (i + 1) * 86400000),
    hasAttachments: true,
    attachments: [{ filename: `${c.name.replace(/\s+/g, '_')}_Resume.pdf`, contentType: 'application/pdf', size: 142000 }]
  })));
  console.log(`   Created ${candidatesData.length} candidate applications in pipeline.`);

  // 14. Setup IT & HR Tickets
  console.log('🎫 Seeding Helpdesk Tickets...');
  await Ticket.deleteMany({ companyId });
  const ticketsData = [
    { title: 'MacBook Pro M3 Max upgrade request for local LLM development', cat: 'hardware', prio: 'high', status: 'in_progress', reporter: seededUsers[17], assignee: seededUsers[40] },
    { title: 'AWS Production IAM role access for EKS staging cluster', cat: 'software', prio: 'critical', status: 'resolved', reporter: seededUsers[13], assignee: seededUsers[8] },
    { title: 'Form 16 Tax deduction clarification for Q2', cat: 'payroll', prio: 'medium', status: 'resolved', reporter: seededUsers[24], assignee: seededUsers[6] },
    { title: 'Office ergonomic chair replacement on 3rd floor', cat: 'facilities', prio: 'low', status: 'open', reporter: seededUsers[25], assignee: seededUsers[45] },
    { title: 'VPN certificate expired for remote development gateway', cat: 'it_support', prio: 'high', status: 'resolved', reporter: seededUsers[34], assignee: seededUsers[40] },
  ];
  let tckCount = 1;
  await Ticket.insertMany(ticketsData.map(t => ({
    companyId,
    ticketNumber: `TCK-${String(tckCount++).padStart(3, '0')}`,
    title: t.title,
    description: `Request regarding: ${t.title}. Please review and update accordingly.`,
    category: t.cat,
    priority: t.prio,
    status: t.status,
    reportedBy: t.reporter._id,
    assignedTo: t.assignee._id,
    dueDate: new Date(Date.now() + 3 * 86400000),
    department: t.reporter.department,
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date()
  })));
  console.log(`   Created ${ticketsData.length} tickets.`);

  console.log('\n======================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY FOR ABACA SYSTEM!');
  console.log(`🏢 Company: Abaca System (ID: ${companyId})`);
  console.log(`👥 Total Employees: ${seededUsers.length}`);
  console.log(`🔑 Login Email: anirudh@abacasys.com | Password: password123`);
  console.log('   All 50 employees share the password: password123');
  console.log('======================================================\n');

  process.exit(0);
}

seedAbaca().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
