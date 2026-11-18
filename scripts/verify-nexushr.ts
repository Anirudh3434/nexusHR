import './_load-env';
import connectDB from '../lib/mongodb';
import Company from '../models/Company';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import HRKnowledgeBase from '../models/HRKnowledgeBase';

async function main() {
  await connectDB();
  const c = await Company.findOne({ code: 'NEXUSHR' }).lean() as any;
  if (!c) {
    console.error('Company NEXUSHR not found');
    process.exit(1);
  }

  const userCount = await User.countDocuments({ companyId: c._id });
  const proj = await Project.findOne({ companyId: c._id }).lean() as any;
  const taskCount = await Task.countDocuments({ companyId: c._id });
  const kbCount = await HRKnowledgeBase.countDocuments({ companyId: c._id });

  console.log('--- VERIFICATION RESULT ---');
  console.log(`Company Name:           ${c.name}`);
  console.log(`Company Code:           ${c.code}`);
  console.log(`Company ID:             ${c._id}`);
  console.log(`Total Employees:        ${userCount}`);
  console.log(`Flagship Project:       ${proj?.name} (${proj?.projectNumber})`);
  console.log(`Total Tasks:            ${taskCount}`);
  console.log(`Knowledge Base Entries: ${kbCount}`);

  const sampleUsers = await User.find({ companyId: c._id })
    .select('name email role employeeId designation')
    .limit(5)
    .lean();
  console.log('\nSample Users:');
  sampleUsers.forEach((u: any) => console.log(` - [${u.employeeId}] ${u.name} (${u.role}) - ${u.designation} <${u.email}>`));

  const sampleArticles = await HRKnowledgeBase.find({ companyId: c._id })
    .select('category title priority')
    .lean();
  console.log(`\nKnowledge Base Categories covered: ${Array.from(new Set(sampleArticles.map((a: any) => a.category))).join(', ')}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

