const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Mock Data
const DUMMY_USERS = [
  { name: 'Alice Admin', email: 'admin@hrm.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Alice+Admin&background=random', department: 'Management', status: 'Active', hireDate: '2023-01-15' },
  { name: 'Hank HR', email: 'hr@hrm.com', role: 'hr', avatar: 'https://ui-avatars.com/api/?name=Hank+HR&background=random', department: 'HR', status: 'Active', hireDate: '2023-03-10' },
  { name: 'Emma Employee', email: 'employee@hrm.com', role: 'employee', department: 'Engineering', avatar: 'https://ui-avatars.com/api/?name=Emma+Employee&background=random', status: 'Active', hireDate: '2024-05-22' },
  { name: 'John Doe', email: 'john.doe@hrm.com', role: 'employee', department: 'Marketing', status: 'On Leave', hireDate: '2022-11-05', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=random' },
  { name: 'Jane Smith', email: 'jane.smith@hrm.com', role: 'employee', department: 'Sales', status: 'Active', hireDate: '2024-01-20', avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=random' },
];

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Clear existing data
    await mongoose.connection.db.dropCollection('users').catch(() => {});
    await mongoose.connection.db.dropCollection('attendances').catch(() => {});
    console.log('Cleared existing data.');

    // Hash passwords and insert users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const usersWithPasswords = DUMMY_USERS.map(user => ({
      ...user,
      password: hashedPassword,
    }));

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const createdUsers = await User.insertMany(usersWithPasswords);
    console.log(`Inserted ${createdUsers.length} users.`);

    // Insert Attendance (Optional, mapping to real IDs)
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const attendanceRecords = [
      { employeeId: createdUsers[2]._id, employeeName: 'Emma Employee', date: '2024-10-24', status: 'Present', checkIn: '08:55 AM', checkOut: '05:05 PM' },
      { employeeId: createdUsers[3]._id, employeeName: 'John Doe', date: '2024-10-24', status: 'On Leave', checkIn: '-', checkOut: '-' },
      { employeeId: createdUsers[4]._id, employeeName: 'Jane Smith', date: '2024-10-24', status: 'Present', checkIn: '09:02 AM', checkOut: '05:15 PM' },
    ];
    await Attendance.insertMany(attendanceRecords);
    console.log('Inserted attendance records.');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
