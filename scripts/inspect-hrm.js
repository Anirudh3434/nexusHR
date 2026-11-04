const mongoose = require('mongoose');
const uri = 'mongodb+srv://anirudhbharat415:Ani2002@backend.mhts0iw.mongodb.net/hrm';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log('Collections in hrm:', collections.map(c => c.name));

  const companies = await db.collection('companies').find({}).toArray();
  console.log('Total Companies:', companies.length);
  for (const c of companies) {
    console.log('--- COMPANY ---');
    console.log('ID:    ', c._id.toString());
    console.log('Name:  ', c.name);
    console.log('Code:  ', c.code);
    console.log('Active:', c.isActive);
    console.log('OnboardingComplete:', c.onboardingComplete);
  }

  const users = await db.collection('users').find({}, { projection: { name: 1, email: 1, role: 1, companyId: 1 } }).limit(5).toArray();
  console.log('Sample Users:', users);

  await mongoose.disconnect();
}

main().catch(err => console.error(err));

