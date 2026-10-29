import mongoose, { Schema, model, models } from 'mongoose';

const DesignationSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['director', 'manager', 'lead', 'senior', 'junior', 'intern', 'hr'],
    default: 'junior',
  },
  department: {
    type: String,
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

DesignationSchema.index({ companyId: 1, name: 1 });
DesignationSchema.index({ companyId: 1, department: 1 });

const Designation = models.Designation || model('Designation', DesignationSchema);

export default Designation;
