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

const Designation = models.Designation || model('Designation', DesignationSchema);

export default Designation;
