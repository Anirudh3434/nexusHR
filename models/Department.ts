import mongoose, { Schema, model, models } from 'mongoose';

const DepartmentSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Department = models.Department || model('Department', DepartmentSchema);

export default Department;
