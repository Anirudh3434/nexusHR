const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('Connecting to:', uri ? uri.replace(/:([^@]+)@/, ':****@') : 'MISSING_URI');

async function main() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('Successfully connected to MongoDB!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));

    const companies = await db.collection('companies').find({}).toArray();
    console.log(`Found ${companies.length} companies:`);
    companies.forEach((c, idx) => {
      console.log(`[${idx + 1}] Name: "${c.name}", Code: "${c.code}", Slug: "${c.slug}", Active: ${c.isActive}, OnboardingComplete: ${c.onboardingComplete}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}

main();
