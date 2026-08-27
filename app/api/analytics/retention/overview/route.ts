import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import RetentionPrediction from '@/models/RetentionPrediction';
import RetentionAlert from '@/models/RetentionAlert';
import Department from '@/models/Department';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    let companyId = headersList.get('x-company-id');

    // Fallback: Check query parameter if headers are not set
    if (!companyId) {
      const url = new URL(req.url);
      companyId = url.searchParams.get('companyId');
    }

    if (!companyId) {
      // Fallback to first active company for admin session
      const Company = (await import('@/models/Company')).default;
      const firstCompany = await Company.findOne({ isActive: true });
      if (firstCompany) {
        companyId = firstCompany._id.toString();
      } else {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Get all employees in the company
    const users = await User.find({
      companyId,
      isActive: true,
    }).select('_id name email designation department role avatar');

    const userIds = users.map(u => u._id);

    // 2. Fetch latest predictions for all employees
    const predictions = await RetentionPrediction.find({
      employeeId: { $in: userIds },
      companyId,
    }).sort({ assessmentDate: -1 });

    // Map latest prediction per user
    const latestPredictionsMap = new Map<string, any>();
    for (const pred of predictions) {
      const empIdStr = pred.employeeId.toString();
      if (!latestPredictionsMap.has(empIdStr)) {
        latestPredictionsMap.set(empIdStr, pred);
      }
    }

    // 3. Assemble employee risk profiles
    const employeeProfiles = users.map(user => {
      const pred = latestPredictionsMap.get(user._id.toString());
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        designation: user.designation || 'Team Member',
        department: user.department || 'General',
        role: user.role,
        avatar: user.avatar || null,
        riskScore: pred?.riskScore ?? null,
        riskLevel: pred?.riskLevel ?? null,
        riskChange: pred?.riskChange ?? 0,
        factors: pred?.factors ?? [],
        lastAssessment: pred?.assessmentDate ?? null,
      };
    });

    const assessedEmployees = employeeProfiles.filter(e => e.riskScore !== null);
    const avgRiskScore = assessedEmployees.length > 0
      ? Math.round(assessedEmployees.reduce((sum, e) => sum + (e.riskScore || 0), 0) / assessedEmployees.length)
      : 0;

    // 4. Risk distribution
    const riskDistribution = {
      low: assessedEmployees.filter(e => e.riskLevel === 'low').length,
      medium: assessedEmployees.filter(e => e.riskLevel === 'medium').length,
      high: assessedEmployees.filter(e => e.riskLevel === 'high').length,
      critical: assessedEmployees.filter(e => e.riskLevel === 'critical').length,
    };

    // 5. Department Breakdown
    const deptMap = new Map<string, { total: number; sumRisk: number; count: number; highRiskCount: number }>();
    for (const emp of employeeProfiles) {
      const dept = emp.department || 'General';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, sumRisk: 0, count: 0, highRiskCount: 0 });
      }
      const data = deptMap.get(dept)!;
      data.total++;
      if (emp.riskScore !== null) {
        data.sumRisk += emp.riskScore;
        data.count++;
        if (emp.riskLevel === 'high' || emp.riskLevel === 'critical') {
          data.highRiskCount++;
        }
      }
    }

    const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => ({
      department,
      totalEmployees: data.total,
      assessedEmployees: data.count,
      averageRiskScore: data.count > 0 ? Math.round(data.sumRisk / data.count) : 0,
      highRiskCount: data.highRiskCount,
      riskLevel: data.count === 0 ? 'unknown' : (data.sumRisk / data.count) > 60 ? 'high' : (data.sumRisk / data.count) > 40 ? 'medium' : 'low',
    }));

    // 6. Factor Averages across company
    const factorTotals: Record<string, { sum: number; count: number }> = {
      attendance: { sum: 0, count: 0 },
      performance: { sum: 0, count: 0 },
      engagement: { sum: 0, count: 0 },
      tenure: { sum: 0, count: 0 },
      compensation: { sum: 0, count: 0 },
      workload: { sum: 0, count: 0 },
      manager_relationship: { sum: 0, count: 0 },
    };

    for (const emp of assessedEmployees) {
      for (const f of emp.factors) {
        if (factorTotals[f.name]) {
          factorTotals[f.name].sum += f.value;
          factorTotals[f.name].count++;
        }
      }
    }

    const factorAverages = Object.entries(factorTotals).map(([name, { sum, count }]) => ({
      name,
      value: count > 0 ? Math.round(sum / count) : 60,
    }));

    // 7. Recent Alerts
    const alerts = await RetentionAlert.find({ companyId })
      .populate('employeeId', 'name designation department email')
      .sort({ createdAt: -1 })
      .limit(10);

    // 8. Top at-risk employees
    const topRiskEmployees = [...assessedEmployees]
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      overview: {
        totalEmployees: employeeProfiles.length,
        assessedEmployeesCount: assessedEmployees.length,
        averageRiskScore: avgRiskScore,
        riskDistribution,
        departmentBreakdown,
        factorAverages,
        topRiskEmployees,
        recentAlerts: alerts,
        employees: employeeProfiles,
      }
    });

  } catch (error: any) {
    console.error('Error fetching retention overview:', error);
    return NextResponse.json({ message: 'Error fetching retention overview', error: error.message }, { status: 500 });
  }
}
