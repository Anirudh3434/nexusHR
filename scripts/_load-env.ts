// Loaded before any app module so lib/mongodb.ts sees MONGODB_URI at module init.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
