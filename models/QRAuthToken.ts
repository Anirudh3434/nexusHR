import mongoose, { Schema, model, models } from 'mongoose';

const QRAuthTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Automatically delete after expiry
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const QRAuthToken = mongoose.models.QRAuthToken || mongoose.model('QRAuthToken', QRAuthTokenSchema);

export default QRAuthToken;
