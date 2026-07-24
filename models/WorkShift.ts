import mongoose, { Schema, model, models } from 'mongoose';

const WorkShiftSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String, // e.g., Day Shift, Night Shift
    required: true,
  },
  startTime: {
    type: String, // e.g., "09:00"
    required: true,
  },
  endTime: {
    type: String, // e.g., "18:00"
    required: true,
  },
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  lateThreshold: {
    type: Number, // Minutes after startTime to consider late
    default: 15,
  },
}, {
  timestamps: true,
});

const WorkShift = models.WorkShift || model('WorkShift', WorkShiftSchema);

export default WorkShift;
