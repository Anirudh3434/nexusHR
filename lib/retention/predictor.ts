import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';
import RetentionPrediction from '@/models/RetentionPrediction';
import RetentionAlert from '@/models/RetentionAlert';

interface RetentionFactors {
  attendance: number;
  performance: number;
  engagement: number;
  tenure: number;
  compensation: number;
  workload: number;
  manager_relationship: number;
}

interface FactorWithTrend {
  name: string;
  value: number;
  weight: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface PredictionResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: FactorWithTrend[];
  confidence: number;
}

// Calculate attendance score (0-100, higher is better)
const calculateAttendanceScore = async (employeeId: string, daysToLookBack: number = 30): Promise<{ score: number; trend: string }> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToLookBack);

  const attendances = await Attendance.find({
    employeeId,
    date: { $gte: startDate }
  }).sort({ date: -1 });

  if (attendances.length === 0) {
    return { score: 50, trend: 'stable' }; // Neutral score if no data
  }

  // Calculate metrics
  const totalDays = attendances.length;
  const lateDays = attendances.filter(a => a.isLate).length;
  const absentDays = attendances.filter(a => a.status === 'Absent').length;
  const onTimeDays = totalDays - lateDays - absentDays;

  // Score calculation (0-100)
  const punctualityScore = (onTimeDays / totalDays) * 100;
  
  // Determine trend by comparing first half vs second half
  const midPoint = Math.floor(totalDays / 2);
  const firstHalf = attendances.slice(midPoint);
  const secondHalf = attendances.slice(0, midPoint);
  
  const firstHalfLate = firstHalf.filter(a => a.isLate).length;
  const secondHalfLate = secondHalf.filter(a => a.isLate).length;
  
  let trend = 'stable';
  if (secondHalfLate > firstHalfLate + 1) {
    trend = 'declining';
  } else if (firstHalfLate > secondHalfLate + 1) {
    trend = 'improving';
  }

  return { score: punctualityScore, trend };
};

// Calculate performance score (0-100, higher is better)
const calculatePerformanceScore = async (employeeId: string, daysToLookBack: number = 30): Promise<{ score: number; trend: string }> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToLookBack);

  const analyses = await PerformanceAnalysis.find({
    employeeId,
    date: { $gte: startDate }
  }).sort({ date: -1 });

  if (analyses.length === 0) {
    return { score: 50, trend: 'stable' };
  }

  // Average rating
  const avgRating = analyses.reduce((sum, a) => sum + a.rating, 0) / analyses.length;
  const score = (avgRating / 10) * 100; // Convert 1-10 scale to 0-100

  // Determine trend
  const midPoint = Math.floor(analyses.length / 2);
  const firstHalfAvg = analyses.slice(midPoint).reduce((sum, a) => sum + a.rating, 0) / Math.max(midPoint, 1);
  const secondHalfAvg = analyses.slice(0, midPoint).reduce((sum, a) => sum + a.rating, 0) / Math.max(midPoint, 1);
  
  let trend = 'stable';
  if (secondHalfAvg > firstHalfAvg + 0.5) {
    trend = 'improving';
  } else if (firstHalfAvg > secondHalfAvg + 0.5) {
    trend = 'declining';
  }

  return { score, trend };
};

// Calculate engagement score (0-100, higher is better)
// Placeholder for now - can be enhanced with survey data, activity logs, etc.
const calculateEngagementScore = async (employeeId: string): Promise<{ score: number; trend: string }> => {
  // For Phase 1, return a neutral score
  // In Phase 2, integrate with Survey model, activity logs, etc.
  return { score: 60, trend: 'stable' };
};

// Calculate tenure score (0-100, higher is better for retention)
const calculateTenureScore = async (employeeId: string): Promise<{ score: number; trend: string }> => {
  const employee = await Employee.findOne({ userId: employeeId });
  if (!employee || !employee.joiningDate) {
    return { score: 50, trend: 'stable' };
  }

  const joiningDate = new Date(employee.joiningDate);
  const now = new Date();
  const tenureMonths = (now.getFullYear() - joiningDate.getFullYear()) * 12 + (now.getMonth() - joiningDate.getMonth());

  // Tenure curve: higher score for longer tenure
  let score = 50;
  if (tenureMonths < 3) {
    score = 30; // High risk in first 3 months
  } else if (tenureMonths < 6) {
    score = 50; // Medium risk
  } else if (tenureMonths < 12) {
    score = 70; // Lower risk after 6 months
  } else if (tenureMonths < 24) {
    score = 85; // Good retention after 1 year
  } else {
    score = 95; // Very stable after 2 years
  }

  return { score, trend: 'stable' }; // Tenure trend is not applicable
};

// Calculate compensation score (0-100, higher is better)
// Placeholder for Phase 1 - Phase 2 will integrate with market data
const calculateCompensationScore = async (employeeId: string): Promise<{ score: number; trend: string }> => {
  // For Phase 1, return neutral score
  // In Phase 2, integrate with MarketData model
  return { score: 60, trend: 'stable' };
};

// Calculate workload score (0-100, higher is better)
// Placeholder for Phase 1 - can integrate with task data, overtime, etc.
const calculateWorkloadScore = async (employeeId: string): Promise<{ score: number; trend: string }> => {
  // For Phase 1, return neutral score
  // In Phase 2, integrate with Task model, overtime data
  return { score: 60, trend: 'stable' };
};

// Calculate manager relationship score (0-100, higher is better)
// Placeholder for Phase 1 - can integrate with feedback, 1:1s, etc.
const calculateManagerRelationshipScore = async (employeeId: string): Promise<{ score: number; trend: string }> => {
  // For Phase 1, return neutral score
  // In Phase 2, integrate with feedback, survey data
  return { score: 60, trend: 'stable' };
};

// Main prediction function using rule-based scoring (Phase 1)
export const predictRetentionRisk = async (employeeId: string, companyId: string): Promise<PredictionResult> => {
  await connectDB();

  // Calculate all factors
  const [attendance, performance, engagement, tenure, compensation, workload, managerRel] = await Promise.all([
    calculateAttendanceScore(employeeId),
    calculatePerformanceScore(employeeId),
    calculateEngagementScore(employeeId),
    calculateTenureScore(employeeId),
    calculateCompensationScore(employeeId),
    calculateWorkloadScore(employeeId),
    calculateManagerRelationshipScore(employeeId),
  ]);

  // Define weights for each factor (sum should be 1)
  const weights = {
    attendance: 0.25,
    performance: 0.20,
    engagement: 0.15,
    tenure: 0.15,
    compensation: 0.10,
    workload: 0.10,
    manager_relationship: 0.05,
  };

  // Calculate weighted risk score (inverse - lower scores = higher risk)
  const factors: FactorWithTrend[] = [
    { name: 'attendance', value: attendance.score, weight: weights.attendance, trend: attendance.trend as any },
    { name: 'performance', value: performance.score, weight: weights.performance, trend: performance.trend as any },
    { name: 'engagement', value: engagement.score, weight: weights.engagement, trend: engagement.trend as any },
    { name: 'tenure', value: tenure.score, weight: weights.tenure, trend: tenure.trend as any },
    { name: 'compensation', value: compensation.score, weight: weights.compensation, trend: compensation.trend as any },
    { name: 'workload', value: workload.score, weight: weights.workload, trend: workload.trend as any },
    { name: 'manager_relationship', value: managerRel.score, weight: weights.manager_relationship, trend: managerRel.trend as any },
  ];

  // Calculate overall score (0-100)
  const overallScore = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);

  // Convert to risk score (inverse - lower overall score = higher risk)
  const riskScore = 100 - overallScore;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore < 25) {
    riskLevel = 'low';
  } else if (riskScore < 50) {
    riskLevel = 'medium';
  } else if (riskScore < 75) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }

  // Confidence score based on data availability
  const confidence = 70; // Base confidence for rule-based model

  return {
    riskScore,
    riskLevel,
    factors,
    confidence,
  };
};

// Run retention prediction for a single employee and store in database
export const runEmployeeRetentionPrediction = async (employeeId: string, companyId: string): Promise<string> => {
  await connectDB();

  const prediction = await predictRetentionRisk(employeeId, companyId);

  // Get previous prediction for comparison
  const previousPrediction = await RetentionPrediction.findOne({
    employeeId,
    companyId,
  }).sort({ assessmentDate: -1 });

  const previousRiskScore = previousPrediction?.riskScore || null;
  const riskChange = previousRiskScore !== null ? prediction.riskScore - previousRiskScore : 0;

  // Store new prediction
  const newPrediction = await RetentionPrediction.create({
    employeeId,
    companyId,
    assessmentDate: new Date(),
    riskScore: prediction.riskScore,
    riskLevel: prediction.riskLevel,
    factors: prediction.factors,
    modelVersion: '1.0-rule-based',
    confidence: prediction.confidence,
    previousRiskScore,
    riskChange,
  });

  // Update employee record
  await Employee.findOneAndUpdate(
    { userId: employeeId },
    {
      retentionRiskScore: prediction.riskScore,
      retentionRiskFactors: prediction.factors.map(f => ({
        factor: f.name,
        impact: f.value,
        trend: f.trend,
      })),
      lastRiskAssessment: new Date(),
    }
  );

  // Generate alerts if needed
  await generateRetentionAlerts(employeeId, companyId, newPrediction._id.toString(), prediction, previousPrediction);

  return newPrediction._id.toString();
};

// Generate alerts based on prediction changes
const generateRetentionAlerts = async (
  employeeId: string,
  companyId: string,
  predictionId: string,
  currentPrediction: PredictionResult,
  previousPrediction: any
) => {
  const alerts = [];

  // Alert for significant risk increase (>20 points)
  if (previousPrediction && currentPrediction.riskScore - previousPrediction.riskScore > 20) {
    alerts.push({
      employeeId,
      companyId,
      predictionId,
      alertType: 'risk_increase',
      severity: currentPrediction.riskLevel === 'critical' ? 'critical' : 'warning',
      message: `Retention risk increased by ${currentPrediction.riskScore - previousPrediction.riskScore} points to ${currentPrediction.riskScore}`,
      details: {
        previousScore: previousPrediction.riskScore,
        currentScore: currentPrediction.riskScore,
      },
    });
  }

  // Alert for critical risk
  if (currentPrediction.riskLevel === 'critical') {
    alerts.push({
      employeeId,
      companyId,
      predictionId,
      alertType: 'critical_risk',
      severity: 'critical',
      message: `Employee at critical retention risk (${currentPrediction.riskScore}/100)`,
      details: {
        riskScore: currentPrediction.riskScore,
        factors: currentPrediction.factors,
      },
    });
  }

  // Create alerts
  if (alerts.length > 0) {
    await RetentionAlert.insertMany(alerts);
  }
};

// Run retention predictions for all employees in a company
export const runCompanyRetentionPredictions = async (companyId: string): Promise<{ processed: number; errors: number }> => {
  await connectDB();

  const employees = await User.find({ companyId, isActive: true });
  
  let processed = 0;
  let errors = 0;

  for (const employee of employees) {
    try {
      await runEmployeeRetentionPrediction(employee._id.toString(), companyId);
      processed++;
    } catch (error) {
      console.error(`Error processing retention prediction for employee ${employee._id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
};
