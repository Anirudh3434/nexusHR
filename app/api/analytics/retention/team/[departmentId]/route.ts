import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RetentionPrediction from '@/models/RetentionPrediction';
import User from '@/models/User';
import { headers } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');

    if (!companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId } = await params;

    // Get all employees in the department
    const employees = await User.find({
      companyId,
      department: departmentId,
      isActive: true,
    }).select('_id name designation department');

    // Get the most recent prediction for each employee
    const employeeIds = employees.map(e => e._id);
    const predictions = await RetentionPrediction.find({
      employeeId: { $in: employeeIds },
      companyId,
    }).sort({ assessmentDate: -1 });

    // Map predictions to employees
    const teamData = employees.map(employee => {
      const prediction = predictions.find(p => p.employeeId.toString() === employee._id.toString());
      return {
        employeeId: employee._id.toString(),
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
        riskScore: prediction?.riskScore || null,
        riskLevel: prediction?.riskLevel || null,
        lastAssessment: prediction?.assessmentDate || null,
      };
    });

    // Calculate team statistics
    const withRiskScores = teamData.filter(d => d.riskScore !== null);
    const avgRiskScore = withRiskScores.length > 0
      ? withRiskScores.reduce((sum, d) => sum + (d.riskScore || 0), 0) / withRiskScores.length
      : 0;

    const riskDistribution = {
      low: withRiskScores.filter(d => d.riskLevel === 'low').length,
      medium: withRiskScores.filter(d => d.riskLevel === 'medium').length,
      high: withRiskScores.filter(d => d.riskLevel === 'high').length,
      critical: withRiskScores.filter(d => d.riskLevel === 'critical').length,
    };

    return NextResponse.json({
      team: teamData,
      statistics: {
        totalEmployees: teamData.length,
        assessedEmployees: withRiskScores.length,
        averageRiskScore: Math.round(avgRiskScore),
        riskDistribution,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching team retention data:', error);
    return NextResponse.json({ message: 'Error fetching team retention data', error: error.message }, { status: 500 });
  }
}
