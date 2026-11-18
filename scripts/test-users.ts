import './_load-env';
import connectDB from '../lib/mongodb';
import User from '../models/User';

async function main() {
  await connectDB();
  const users = await User.find({}).select('name email role companyId isActive').limit(20).lean();
  for (const u of users as any[]) {
    console.log(`${u.name} | ${u.email} | ${u.role} | company=${u.companyId} | active=${u.isActive}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
