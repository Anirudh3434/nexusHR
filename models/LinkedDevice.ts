import mongoose, { Schema, model, models } from 'mongoose';

const LinkedDeviceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true, // Only one device per user as requested
  },
  deviceName: {
    type: String,
    required: [true, 'Device name is required'],
  },
  deviceId: {
    type: String,
    required: [true, 'Unique Device ID is required'],
    unique: true,
  },
  platform: {
    type: String,
    enum: ['iOS', 'Android', 'Other'],
    required: true,
  },
  osVersion: {
    type: String,
  },
  model: {
    type: String,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  batteryLevel: {
    type: Number, // 0 to 1
  },
  batteryState: {
    type: String, // 'charging', 'unplugged', 'full', 'unknown'
  },
  networkType: {
    type: String, // 'wifi', 'cellular', 'none', 'unknown'
  },
  isConnected: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Force refresh the model in development to ensure new fields are caught
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.LinkedDevice;
}

const LinkedDevice = mongoose.models.LinkedDevice || mongoose.model('LinkedDevice', LinkedDeviceSchema);

export default LinkedDevice;
