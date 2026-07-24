import mongoose, { Schema, model, models } from 'mongoose';

const SalaryComponentSchema = new Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['earning', 'deduction'], 
    required: true 
  },
  calculationType: { 
    type: String, 
    enum: ['fixed', 'percentage', 'formula'], 
    default: 'fixed' 
  },
  value: { type: Number, default: 0 },
  percentageOf: { type: String, default: 'basic' },
  isTaxable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
});

const SalaryStructureSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  components: [SalaryComponentSchema],
  // Standard components
  hra: { type: Number, default: 0 },
  da: { type: Number, default: 0 },
  conveyance: { type: Number, default: 0 },
  medical: { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  esi: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 0 },
  // Totals
  grossSalary: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  ctc: { type: Number, required: true },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Calculate totals method
SalaryStructureSchema.methods.calculateTotals = function() {
  const doc = this;
  
  // Calculate HRA (40% of basic for non-metro)
  if (!doc.hra) doc.hra = Math.round(doc.basicSalary * 0.40);
  
  // Calculate other standard components
  const earnings = doc.components
    ? doc.components.filter((c: any) => c.type === 'earning' && c.isActive)
        .reduce((sum: number, c: any) => sum + (c.value || 0), 0)
    : 0;
  
  const deductions = doc.components
    ? doc.components.filter((c: any) => c.type === 'deduction' && c.isActive)
        .reduce((sum: number, c: any) => sum + (c.value || 0), 0)
    : 0;
  
  // Standard deductions
  doc.pf = Math.min(Math.round(doc.basicSalary * 0.12), 1800); // 12% of basic, capped at 1800
  doc.esi = doc.grossSalary <= 21000 ? Math.round(doc.grossSalary * 0.0075) : 0; // 0.75% if gross <= 21000
  
  // Calculate totals
  doc.grossSalary = doc.basicSalary + (doc.hra || 0) + (doc.da || 0) + (doc.conveyance || 0) + 
                    (doc.medical || 0) + (doc.specialAllowance || 0) + earnings;
  
  doc.totalDeductions = doc.pf + doc.esi + (doc.professionalTax || 0) + (doc.tds || 0) + deductions;
  doc.netSalary = doc.grossSalary - doc.totalDeductions;
  
  // CTC = Gross + Employer PF + Employer ESI
  const employerPf = doc.pf;
  const employerEsi = doc.grossSalary <= 21000 ? Math.round(doc.grossSalary * 0.0325) : 0;
  doc.ctc = doc.grossSalary + employerPf + employerEsi;
  
  return doc;
};

const SalaryStructure = models.SalaryStructure || model('SalaryStructure', SalaryStructureSchema);

export default SalaryStructure;
