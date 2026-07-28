import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';
import User from '@/models/User';
import Leave from '@/models/Leave';
import Payroll from '@/models/Payroll';

export interface AggregationConfig {
  dataSource: string;
  aggregation: string; // 'sum', 'avg', 'count', 'min', 'max'
  groupBy?: string; // 'day', 'week', 'month', 'quarter', 'year', 'department', 'designation'
  filters?: Record<string, any>;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface AggregatedData {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

// Attendance data aggregation
export const aggregateAttendanceData = async (
  companyId: string,
  config: AggregationConfig
): Promise<AggregatedData[]> => {
  await connectDB();

  const query: any = { companyId };
  
  if (config.filters) {
    Object.assign(query, config.filters);
  }
  
  if (config.dateRange) {
    query.date = {
      $gte: config.dateRange.startDate,
      $lte: config.dateRange.endDate
    };
  }

  const attendances = await Attendance.find(query);

  if (config.groupBy === 'department') {
    // Group by department
    const departmentGroups = new Map<string, number[]>();
    
    for (const attendance of attendances) {
      const user = await User.findById(attendance.employeeId);
      if (user) {
        const dept = user.department || 'Unknown';
        if (!departmentGroups.has(dept)) {
          departmentGroups.set(dept, []);
        }
        
        const value = config.aggregation === 'sum' 
          ? attendance.totalHours || 0
          : config.aggregation === 'count'
          ? 1
          : attendance.totalHours || 0;
          
        departmentGroups.get(dept)!.push(value);
      }
    }

    const result: AggregatedData[] = [];
    for (const [dept, values] of departmentGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: dept, value: aggregatedValue });
    }

    return result;
  } else if (config.groupBy && ['day', 'week', 'month', 'quarter', 'year'].includes(config.groupBy)) {
    // Time-based grouping
    const timeGroups = new Map<string, number[]>();
    
    for (const attendance of attendances) {
      const date = new Date(attendance.date);
      let key: string;
      
      switch (config.groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }

      const value = config.aggregation === 'sum'
        ? attendance.totalHours || 0
        : config.aggregation === 'count'
        ? 1
        : attendance.totalHours || 0;

      timeGroups.get(key)!.push(value);
    }

    const result: AggregatedData[] = [];
    for (const [key, values] of timeGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: key, value: aggregatedValue });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    // No grouping, return single aggregated value
    const values = attendances.map(a => 
      config.aggregation === 'sum' ? a.totalHours || 0 :
      config.aggregation === 'count' ? 1 :
      a.totalHours || 0
    );

    const aggregatedValue = calculateAggregation(values, config.aggregation);
    return [{ label: 'Total', value: aggregatedValue }];
  }
};

// Performance data aggregation
export const aggregatePerformanceData = async (
  companyId: string,
  config: AggregationConfig
): Promise<AggregatedData[]> => {
  await connectDB();

  const query: any = { companyId };
  
  if (config.filters) {
    Object.assign(query, config.filters);
  }
  
  if (config.dateRange) {
    query.date = {
      $gte: config.dateRange.startDate,
      $lte: config.dateRange.endDate
    };
  }

  const analyses = await PerformanceAnalysis.find(query);

  if (config.groupBy === 'department') {
    const departmentGroups = new Map<string, number[]>();
    
    for (const analysis of analyses) {
      const user = await User.findById(analysis.employeeId);
      if (user) {
        const dept = user.department || 'Unknown';
        if (!departmentGroups.has(dept)) {
          departmentGroups.set(dept, []);
        }
        
        const value = config.aggregation === 'sum'
          ? analysis.rating
          : config.aggregation === 'count'
          ? 1
          : analysis.rating;
          
        departmentGroups.get(dept)!.push(value);
      }
    }

    const result: AggregatedData[] = [];
    for (const [dept, values] of departmentGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: dept, value: aggregatedValue });
    }

    return result;
  } else if (config.groupBy && ['day', 'week', 'month', 'quarter', 'year'].includes(config.groupBy)) {
    const timeGroups = new Map<string, number[]>();
    
    for (const analysis of analyses) {
      const date = new Date(analysis.date);
      let key: string;
      
      switch (config.groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }

      const value = config.aggregation === 'sum'
        ? analysis.rating
        : config.aggregation === 'count'
        ? 1
        : analysis.rating;

      timeGroups.get(key)!.push(value);
    }

    const result: AggregatedData[] = [];
    for (const [key, values] of timeGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: key, value: aggregatedValue });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    const values = analyses.map(a => 
      config.aggregation === 'sum' ? a.rating :
      config.aggregation === 'count' ? 1 :
      a.rating
    );

    const aggregatedValue = calculateAggregation(values, config.aggregation);
    return [{ label: 'Total', value: aggregatedValue }];
  }
};

// Leave data aggregation
export const aggregateLeaveData = async (
  companyId: string,
  config: AggregationConfig
): Promise<AggregatedData[]> => {
  await connectDB();

  const query: any = { companyId };
  
  if (config.filters) {
    Object.assign(query, config.filters);
  }
  
  if (config.dateRange) {
    query.startDate = {
      $gte: config.dateRange.startDate,
      $lte: config.dateRange.endDate
    };
  }

  const leaves = await Leave.find(query);

  if (config.groupBy === 'department') {
    const departmentGroups = new Map<string, number[]>();
    
    for (const leave of leaves) {
      const user = await User.findById(leave.employeeId);
      if (user) {
        const dept = user.department || 'Unknown';
        if (!departmentGroups.has(dept)) {
          departmentGroups.set(dept, []);
        }
        
        const value = config.aggregation === 'sum'
          ? leave.days || 1
          : config.aggregation === 'count'
          ? 1
          : leave.days || 1;
          
        departmentGroups.get(dept)!.push(value);
      }
    }

    const result: AggregatedData[] = [];
    for (const [dept, values] of departmentGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: dept, value: aggregatedValue });
    }

    return result;
  } else {
    const values = leaves.map(l => 
      config.aggregation === 'sum' ? l.days || 1 :
      config.aggregation === 'count' ? 1 :
      l.days || 1
    );

    const aggregatedValue = calculateAggregation(values, config.aggregation);
    return [{ label: 'Total', value: aggregatedValue }];
  }
};

// Payroll data aggregation
export const aggregatePayrollData = async (
  companyId: string,
  config: AggregationConfig
): Promise<AggregatedData[]> => {
  await connectDB();

  const query: any = { companyId };
  
  if (config.filters) {
    Object.assign(query, config.filters);
  }
  
  if (config.dateRange) {
    query.payDate = {
      $gte: config.dateRange.startDate,
      $lte: config.dateRange.endDate
    };
  }

  const payrolls = await Payroll.find(query);

  if (config.groupBy === 'department') {
    const departmentGroups = new Map<string, number[]>();
    
    for (const payroll of payrolls) {
      const user = await User.findById(payroll.employeeId);
      if (user) {
        const dept = user.department || 'Unknown';
        if (!departmentGroups.has(dept)) {
          departmentGroups.set(dept, []);
        }
        
        const value = config.aggregation === 'sum'
          ? payroll.netSalary || 0
          : config.aggregation === 'count'
          ? 1
          : payroll.netSalary || 0;
          
        departmentGroups.get(dept)!.push(value);
      }
    }

    const result: AggregatedData[] = [];
    for (const [dept, values] of departmentGroups.entries()) {
      const aggregatedValue = calculateAggregation(values, config.aggregation);
      result.push({ label: dept, value: aggregatedValue });
    }

    return result;
  } else {
    const values = payrolls.map(p => 
      config.aggregation === 'sum' ? p.netSalary || 0 :
      config.aggregation === 'count' ? 1 :
      p.netSalary || 0
    );

    const aggregatedValue = calculateAggregation(values, config.aggregation);
    return [{ label: 'Total', value: aggregatedValue }];
  }
};

// Helper function to calculate aggregation
const calculateAggregation = (values: number[], aggregation: string): number => {
  if (values.length === 0) return 0;

  switch (aggregation) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0);
    case 'avg':
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((sum, val) => sum + val, 0);
  }
};

// Main aggregation router
export const aggregateData = async (
  companyId: string,
  config: AggregationConfig
): Promise<AggregatedData[]> => {
  switch (config.dataSource) {
    case 'attendance':
      return aggregateAttendanceData(companyId, config);
    case 'performance':
      return aggregatePerformanceData(companyId, config);
    case 'leave':
      return aggregateLeaveData(companyId, config);
    case 'payroll':
      return aggregatePayrollData(companyId, config);
    default:
      throw new Error(`Unknown data source: ${config.dataSource}`);
  }
};
