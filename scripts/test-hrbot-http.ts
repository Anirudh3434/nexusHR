import './_load-env';

import jwt from 'jsonwebtoken';
import axios from 'axios';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import HRKnowledgeBase from '../models/HRKnowledgeBase';
import { getJwtSecret } from '../lib/auth';

async function main() {
  await connectDB();

  // Company that actually has the HR knowledge base seeded (the "Abaca" tenant).
  const email = process.argv[2] || 'anirudh@abacasys.com';
  const user = (await User.findOne({ email, isActive: true }).lean()) as any;
  const companyId = user?.companyId?.toString();
  console.log('company:', companyId, '| user:', user?.name, user?.role);

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      companyId,
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  const ask = async (message: string) => {
    try {
      const res = await axios.post(
        'http://localhost:3000/api/ai/hr/chat',
        { message, history: [] },
        {
          headers: { Cookie: `nexushr_session=${token}`, 'Content-Type': 'application/json' },
          timeout: 120000,
        }
      );
      console.log(`\nQ: ${message}\nstatus: ${res.status} mode: ${res.data?.mode}`);
      console.log(res.data?.response?.slice(0, 400));
      console.log('sources:', JSON.stringify(res.data?.sources ?? []));
    } catch (err: any) {
      console.log(`\nQ: ${message}\nHTTP FAIL:`, err.response?.status, err.response?.data ?? err.message);
    }
  };

  await ask('what is the employee referral bonus?');
  await ask('how many employees are late today?');

  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e?.response?.data ?? e);
  process.exit(1);
});
