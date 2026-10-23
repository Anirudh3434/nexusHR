import { Types } from 'mongoose';
import connectDB from './lib/mongodb';
import Project from './models/Project';
import Task from './models/Task';
import { signSession } from './lib/auth';

interface LeanProject {
  _id: Types.ObjectId;
  name: string;
  companyId: unknown;
  managerId?: unknown;
  createdBy?: unknown;
  milestones?: unknown[];
}
interface LeanTask {
  startDate?: Date;
  dueDate?: Date;
  dependsOn?: unknown[];
}

async function main() {
  await connectDB();
  const projects = (await Project.find({}).lean()) as unknown as LeanProject[];
  let chosen: LeanProject | null = null;
  let tasks: LeanTask[] = [];
  for (const p of projects) {
    const t = (await Task.find({ projectId: p._id }).lean()) as unknown as LeanTask[];
    if (t.some((x) => x.startDate || x.dueDate)) {
      chosen = p;
      tasks = t;
      break;
    }
  }
  if (!chosen && projects.length) {
    chosen = projects[0];
    tasks = (await Task.find({ projectId: chosen._id }).lean()) as unknown as LeanTask[];
  }
  if (!chosen) {
    console.log('NO_PROJECTS');
    process.exit(0);
  }
  const userId = String(chosen.managerId || chosen.createdBy);
  const companyId = String(chosen.companyId);
  const token = signSession(
    { id: userId, role: 'admin', companyId, name: 'Verify', plan: 'complete', features: ['payroll', 'pms', 'ai'] },
    '1d'
  );
  console.log(
    JSON.stringify({
      userId,
      companyId,
      projectId: String(chosen._id),
      projectName: chosen.name,
      taskCount: tasks.length,
      withDates: tasks.filter((t) => t.startDate || t.dueDate).length,
      milestones: (chosen.milestones || []).length,
      deps: tasks.filter((t) => (t.dependsOn || []).length > 0).length,
      token,
    })
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
