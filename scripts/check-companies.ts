// Script to check existing companies in MongoDB
// Run with: npx ts-node scripts/check-companies.ts

import mongoose from 'mongoose';
import Company from '../models/Company';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm';

async function checkCompanies() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    const companies = await Company.find({})
      .select('name code email phone gstNumber panNumber onboardingComplete isActive createdAt')
      .sort({ createdAt: -1 });

    console.log(`Total Companies: ${companies.length}\n`);
    
    if (companies.length === 0) {
      console.log('No companies found in the database.');
    } else {
      console.log('='.repeat(80));
      companies.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.name}`);
        console.log(`   Code: ${c.code}`);
        console.log(`   Email: ${c.email}`);
        console.log(`   Phone: ${c.phone || 'N/A'}`);
        console.log(`   GST: ${c.gstNumber || 'N/A'}`);
        console.log(`   PAN: ${c.panNumber || 'N/A'}`);
        console.log(`   Status: ${c.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Onboarding: ${c.onboardingComplete ? 'Complete' : 'Incomplete'}`);
        console.log(`   Created: ${c.createdAt?.toLocaleDateString() || 'N/A'}`);
        console.log(`   Login URL: http://localhost:3000/${c.code}`);
      });
      console.log('\n' + '='.repeat(80));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCompanies();
