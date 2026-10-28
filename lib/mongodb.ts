import mongoose from 'mongoose';

// NOTE: do NOT enable mongoose.set('sanitizeFilter', true) globally — it
// wraps every operator ({ $gte, $in, $ne, ... }) in $eq, which breaks all
// legitimate range/set queries (dashboard stats, expiries, atomic FSM
// transitions). Injection is instead fixed at each sink: strict typeof /
// length checks on filter values (qr/verify, login), per-source filter
// allowlists (reports), and escaped literals for $regex input.

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/hrm');

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI is not set. Configure it in your deployment environment (e.g. Vercel Project Settings > Environment Variables) so the app does not fall back to localhost.'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
