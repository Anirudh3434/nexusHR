import mongoose, { Schema, model, models } from 'mongoose';

const HolidaySchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['National', 'Company', 'Optional', 'Weekend'],
    default: 'Company',
  },
  description: {
    type: String,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Holiday = models.Holiday || model('Holiday', HolidaySchema);

export default Holiday;
