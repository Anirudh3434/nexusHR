const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm';

async function setup() {
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB!');

  const db = mongoose.connection.db;

  // 1. Setup Company
  const companyCollection = db.collection('companies');
  let company = await companyCollection.findOne({ code: '6VTDA8' });
  
  if (!company) {
    console.log('Creating company Abaca System with code 6VTDA8...');
    const newCompany = {
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
      officeLocation: { latitude: 28.4595, longitude: 77.0266, address: 'Cyber City, Gurugram, HR' },
      geoFenceRadius: 200,
      enableGeoFencing: true,
      isActive: true,
      onboardingComplete: true,
      subscriptionStatus: 'active',
      subscriptionPlan: 'enterprise',
      workHours: { start: '09:00', end: '18:00', workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await companyCollection.insertOne(newCompany);
    company = newCompany;
    console.log('Company created!');
  } else {
    console.log('Found existing company:', company.name, 'code:', company.code);
    await companyCollection.updateOne(
      { _id: company._id },
      { $set: { isActive: true, onboardingComplete: true } }
    );
  }

  // 2. Setup Admin User
  const userCollection = db.collection('users');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminEmail = 'anirudh@abacasys.com';
  let admin = await userCollection.findOne({ email: adminEmail });
  
  if (!admin) {
    console.log(`Creating Admin user ${adminEmail}...`);
    await userCollection.insertOne({
      _id: new mongoose.Types.ObjectId('6ae09796a83eeca0f1a2e7ad'),
      name: 'Anirudh Bhardwaj',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      companyId: company._id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin user created!');
  } else {
    console.log(`Updating password for ${adminEmail}...`);
    await userCollection.updateOne(
      { _id: admin._id },
      { $set: { password: hashedPassword, role: 'admin', companyId: company._id, status: 'active' } }
    );
  }

  console.log('\n======================================================');
  console.log('SUCCESS! Docker MongoDB is configured and ready:');
  console.log('🏢 Company Name: ', company.name);
  console.log('🔑 Company Code: ', company.code);
  console.log('👤 Admin Email:  ', adminEmail);
  console.log('🔒 Password:     ', 'password123');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

