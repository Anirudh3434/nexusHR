const mongoose = require('mongoose');

const uri = 'mongodb+srv://anirudhbharat415:Ani2002@backend.mhts0iw.mongodb.net/hrm';

async function setupHierarchy() {
  await mongoose.connect(uri);
  const companyId = new mongoose.Types.ObjectId('6ae09796a83eeca0f1a2e7ac');
  const users = await mongoose.connection.collection('users').find({ companyId }).toArray();
  const userMap = new Map(users.map(u => [u.name, u]));

  const updates = [];

  const link = (empName, mgrName, level) => {
    const emp = userMap.get(empName);
    const mgr = mgrName ? userMap.get(mgrName) : null;
    if (!emp) {
      console.warn('Emp not found:', empName);
      return;
    }
    updates.push({
      id: emp._id,
      name: emp.name,
      reportsTo: mgr ? mgr._id : null,
      hierarchyLevel: level
    });
  };

  // 1. Executive
  link('Anirudh Bhardwaj', null, 'director'); // CEO - Top Level
  link('Vikram Singhania', 'Anirudh Bhardwaj', 'director'); // CTO reports to CEO

  // 2. Department Heads & Managers -> Report to CEO or CTO
  link('Pooja Malhotra', 'Anirudh Bhardwaj', 'hr'); // Head of HR
  link('Rajesh Nair', 'Anirudh Bhardwaj', 'manager'); // Finance Controller
  link('Sneha Kulkarni', 'Anirudh Bhardwaj', 'manager'); // Director of Sales
  link('Rohan Kapoor', 'Anirudh Bhardwaj', 'manager'); // VP of Product
  link('Aditya Verma', 'Vikram Singhania', 'manager'); // VP of Engineering
  link('Dr. Aarav Bhattacharya', 'Vikram Singhania', 'manager'); // Principal AI Scientist
  link('Kavita Joshi', 'Vikram Singhania', 'lead'); // Lead DevOps Engineer

  // 3. HR Team -> Report to Pooja Malhotra
  link('Gaurav Taneja', 'Pooja Malhotra', 'hr'); // Sr HR Partner
  link('Neha Sharma', 'Gaurav Taneja', 'hr'); // Talent Acq
  link('Bhavna Rajput', 'Gaurav Taneja', 'hr'); // HR Ops
  link('Komal Mahajan', 'Gaurav Taneja', 'hr'); // HR Ops

  // 4. Finance Team -> Report to Rajesh Nair
  link('Ritu Ganguly', 'Rajesh Nair', 'senior');
  link('Meenakshi Sundaram', 'Rajesh Nair', 'senior');

  // 5. Sales & BD Team -> Report to Sneha Kulkarni
  link('Shreya Pillai', 'Sneha Kulkarni', 'lead');
  link('Manish Tiwari', 'Sneha Kulkarni', 'senior');
  link('Sanya Mirchandani', 'Sneha Kulkarni', 'senior');
  link('Sumit Singhal', 'Sneha Kulkarni', 'senior');
  link('Tanya Grover', 'Shreya Pillai', 'junior');
  link('Kriti Bhargava', 'Shreya Pillai', 'junior');

  // 6. Product & Design -> Report to Rohan Kapoor
  link('Divya Menon', 'Rohan Kapoor', 'lead'); // Senior Product Manager
  link('Meera Iyer', 'Rohan Kapoor', 'lead'); // Principal UI/UX Designer
  link('Aayushi Roy', 'Meera Iyer', 'junior');
  link('Ritika Bose', 'Meera Iyer', 'junior');
  link('Anjali Rawat', 'Meera Iyer', 'junior');

  // 7. Data & AI -> Report to Dr. Aarav Bhattacharya
  link('Ananya Sen', 'Dr. Aarav Bhattacharya', 'lead');
  link('Abhishek Ghosh', 'Dr. Aarav Bhattacharya', 'lead');
  link('Pranav Mukherjee', 'Ananya Sen', 'senior');

  // 8. QA & DevOps -> Report to Kavita Joshi & Aditya Verma
  link('Harsh Vardhan', 'Kavita Joshi', 'lead');
  link('Varun Aggarwal', 'Kavita Joshi', 'senior');
  link('Nikhil Vohra', 'Kavita Joshi', 'senior');
  link('Siddharth Mehta', 'Aditya Verma', 'lead'); // QA Lead
  link('Naveen Choudhary', 'Siddharth Mehta', 'senior');
  link('Pallavi Hegde', 'Siddharth Mehta', 'senior');
  link('Rahul Bajaj', 'Siddharth Mehta', 'senior');

  // 9. Engineering & Technology -> Report to Aditya Verma
  // Backend Lead
  link('Kunal Deshmukh', 'Aditya Verma', 'lead'); // Backend Tech Lead
  link('Tanmay Rastogi', 'Kunal Deshmukh', 'senior');
  link('Alok Mathur', 'Kunal Deshmukh', 'senior');
  link('Simran Kaur', 'Kunal Deshmukh', 'junior');

  // Full Stack Lead
  link('Ishaan Saxena', 'Aditya Verma', 'lead'); // Fullstack Lead
  link('Karan Bansal', 'Ishaan Saxena', 'senior');
  link('Akshat Pandya', 'Ishaan Saxena', 'junior');
  link('Yashwant Soni', 'Ishaan Saxena', 'junior');

  // Frontend Lead
  link('Priya Nambiar', 'Aditya Verma', 'lead'); // Frontend Lead
  link('Deepika Chawla', 'Priya Nambiar', 'senior');
  link('Swati Tripathi', 'Priya Nambiar', 'senior');
  link('Girish Chandran', 'Priya Nambiar', 'junior');

  // Mobile
  link('Arjun Reddy', 'Aditya Verma', 'senior');
  link('Mohit Khurana', 'Arjun Reddy', 'junior');

  console.log('Total updates planned:', updates.length);

  for (const u of updates) {
    await mongoose.connection.collection('users').updateOne(
      { _id: u.id },
      { $set: { reportsTo: u.reportsTo, hierarchyLevel: u.hierarchyLevel } }
    );
  }

  console.log('Successfully updated hierarchy in database!');
  process.exit(0);
}

setupHierarchy().catch(e => { console.error(e); process.exit(1); });

