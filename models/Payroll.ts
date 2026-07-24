import mongoose, { Schema, model, models } from 'mongoose';

const PayrollSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  month: {
    type: Number, // 0-11
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  baseSalary: {
    type: Number,
    required: true,
  },
  
  // Additions
  overtimeHours: {
    type: Number,
    default: 0,
  },
  overtimePay: {
    type: Number,
    default: 0,
  },
  bonus: {
    type: Number,
    default: 0,
  },
  
  // Deductions
  totalLateMinutes: {
    type: Number,
    default: 0,
  },
  lateDeduction: {
    type: Number,
    default: 0,
  },
  unpaidLeaves: {
    type: Number,
    default: 0,
  },
  leaveDeduction: {
    type: Number,
    default: 0,
  },
  otherDeductions: {
    type: Number,
    default: 0,
  },
  
  // Final
  netSalary: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Generated', 'Reviewed', 'Paid'],
    default: 'Generated',
  },
  isManualEdit: {
    type: Boolean,
    default: false,
  },
  paymentDate: {
    type: Date,
  },
  note: {
    type: String,
  },
}, {
  timestamps: true,
});

// Prevent duplicate payroll for same month/year/employee
PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payroll = models.Payroll || model('Payroll', PayrollSchema);

export default Payroll;
