import mongoose, { Schema, model, models } from 'mongoose';

const EmployeeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
    required: [true, 'Unique Employee ID is required'],
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
  },
  department: {
    type: String,
    default: 'General',
  },
  designation: {
    type: String,
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  salary: {
    type: Number,
  },
  workShiftId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkShift',
  },
  contactNumber: {
    type: String,
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  status: {
    type: String,
    enum: ['Active', 'Resigned', 'Terminated', 'On Leave'],
    default: 'Active',
  },
  // Retention prediction fields
  retentionRiskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  retentionRiskFactors: [{
    factor: {
      type: String,
      enum: ['attendance', 'performance', 'engagement', 'tenure', 'compensation', 'workload', 'manager_relationship'],
    },
    impact: {
      type: Number,
      min: 0,
      max: 100,
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
    },
  }],
  lastRiskAssessment: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Employee = models.Employee || model('Employee', EmployeeSchema);

export default Employee;
