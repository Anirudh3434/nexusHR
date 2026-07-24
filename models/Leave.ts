import mongoose, { Schema, model, models } from 'mongoose';

const LeaveSchema = new Schema({
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
  type: {
    type: String,
    enum: ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalDays: {
    type: Number,
  },
  reason: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  comment: {
    type: String,
  },
}, {
  timestamps: true,
});

const Leave = models.Leave || model('Leave', LeaveSchema);

export default Leave;
