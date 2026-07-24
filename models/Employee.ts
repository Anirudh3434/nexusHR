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
}, {
  timestamps: true,
});

const Employee = models.Employee || model('Employee', EmployeeSchema);

export default Employee;
