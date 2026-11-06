const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function setSuperAdmin() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }
    await mongoose.connect(uri);
    const SuperAdmin = mongoose.connection.collection('superadmins');
    const password = await bcrypt.hash('Admin@1234', 10);
    
    await SuperAdmin.updateOne(
      { email: 'admin@platform.com' },
      { 
        $set: { 
          name: 'Super Admin', 
          email: 'admin@platform.com', 
          password: password, 
          isActive: true, 
          mustChangePassword: false, 
          tokenVersion: 0 
        } 
      },
      { upsert: true }
    );
    console.log('SUCCESS: Super Admin created/updated successfully!');
    console.log('Email: admin@platform.com');
    console.log('Password: Admin@1234');
    process.exit(0);
  } catch (err) {
    console.error('Error configuring Super Admin:', err);
    process.exit(1);
  }
}

setSuperAdmin();

