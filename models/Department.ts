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

DepartmentSchema.index({ companyId: 1, name: 1 });
DepartmentSchema.index({ companyId: 1, isActive: 1 });

const Department = models.Department || model('Department', DepartmentSchema);

export default Department;
