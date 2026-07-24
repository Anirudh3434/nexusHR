import mongoose from 'mongoose';
import connectDB from './lib/mongodb';
import LinkedDevice from './models/LinkedDevice';
import User from './models/User';

async function checkDevices() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    const devices = await LinkedDevice.find({}).populate('userId', 'name email role');
    
    if (devices.length === 0) {
      console.log('No devices found.');
    } else {
      console.log('\n--- Linked Devices ---');
      devices.forEach((d: any, i: number) => {
        console.log(`[${i + 1}] User: ${d.userId?.name || 'Unknown'} (${d.userId?.role || 'N/A'})`);
        console.log(`    Device: ${d.deviceName} (${d.model})`);
        console.log(`    Platform: ${d.platform} | OS: ${d.osVersion}`);
        console.log(`    Battery: ${Math.round(d.batteryLevel * 100)}% (${d.batteryState})`);
        console.log(`    Network: ${d.networkType} | Active: ${d.isActive}`);
        console.log(`    Last Active: ${d.lastActive}`);
        console.log('---');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error querying devices:', error);
    process.exit(1);
  }
}

checkDevices();
