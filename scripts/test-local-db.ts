import mongoose from 'mongoose';
import './_load-env';

async function check() {
  const localURI = 'mongodb://localhost:27017/hrm';
  const atlasURI = process.env.MONGODB_URI;

  // 1. Try local
  try {
    console.log('Connecting to Local MongoDB...');
    const conn = await mongoose.createConnection(localURI).asPromise();
    console.log('Connected to Local.');
    const Task = conn.model('Task', new mongoose.Schema({}, { strict: false }));
    const tasks = await Task.find({}).lean();
    console.log('Local Tasks:', tasks.map((t: any) => t.taskNumber));
    await conn.close();
  } catch (err: any) {
    console.log('Local Connection failed:', err.message);
  }

  // 2. Try Atlas
  if (!atlasURI) {
    console.log('MONGODB_URI not set - skipping Atlas check.');
    process.exit(0);
  }

  try {
    console.log('Connecting to Atlas MongoDB...');
    const conn = await mongoose.createConnection(atlasURI).asPromise();
    console.log('Connected to Atlas.');
    const Task = conn.model('Task', new mongoose.Schema({}, { strict: false }));
    const tasks = await Task.find({}).lean();
    console.log('Atlas Tasks:', tasks.map((t: any) => t.taskNumber));
    await conn.close();
  } catch (err: any) {
    console.log('Atlas Connection failed:', err.message);
  }

  process.exit(0);
}

check();
