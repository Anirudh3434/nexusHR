import './_load-env';
import connectDB from '../lib/mongodb';
import Attendance from '../models/Attendance';
import User from '../models/User';

async function main() {
  await connectDB();
  const admin = (await User.findOne({ isActive: true, role: 'admin' }).lean()) as any;
  console.log('admin company:', admin?.companyId?.toString(), 'role:', admin?.role);

  const late = await Attendance.find({ status: 'Late' }).sort({ date: -1 }).limit(5).lean();
  for (const d of late as any[]) {
    console.log(
      d.date.toISOString(),
      d.status,
      'company=', d.companyId?.toString(),
      'employee=', d.employeeId?.toString()
    );
  }

  const start = new Date(Date.UTC(2026, 9, 28));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  console.log('\nrange:', start.toISOString(), '->', end.toISOString());
  const inRange = await Attendance.countDocuments({ date: { $gte: start, $lt: end } });
  const inRangeCo = await Attendance.countDocuments({
    date: { $gte: start, $lt: end },
    companyId: admin.companyId,
  });
  const inRangeLate = await Attendance.countDocuments({
    date: { $gte: start, $lt: end },
    status: 'Late',
  });
  console.log('records in range:', inRange, '| same company:', inRangeCo, '| late in range:', inRangeLate);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
