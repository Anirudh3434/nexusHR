import mongoose, { Schema, model, models } from 'mongoose';

const AttendanceSchema = new Schema({
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
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    time: String, // HH:mm
    ip: String,
    location: {
      lat: Number,
      lng: Number,
    },
  },
  checkOut: {
    time: String, // HH:mm
    ip: String,
    location: {
      lat: Number,
      lng: Number,
    },
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half Day', 'On Time', 'Holiday'],
    default: 'Present',
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  lateMinutes: {
    type: Number,
    default: 0,
  },
  shiftStartTime: {
    type: String, // Expected shift start time
  },
  shiftEndTime: {
    type: String, // Expected shift end time
  },
  workShiftId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkShift',
  },
  // Overtime tracking
  overtimeMinutes: {
    type: Number,
    default: 0,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
  isOvertime: {
    type: Boolean,
    default: false,
  },
  manualOvertimeHours: {
    type: Number,
    default: 0,
  },
  manualOvertimeNote: {
    type: String,
  },
  overtimeStatus: {
    type: String,
    enum: ['pending', 'paid', 'comp_off', 'rejected'],
    default: 'pending',
  },
  payrollId: {
    type: Schema.Types.ObjectId,
    ref: 'Payroll',
  },
    workMode: {
    type: String,
    enum: ['office', 'wfh'],
    default: 'office',
  },
  sessions: [
    {
      checkIn: String,
      checkOut: String,
      duration: Number, // Minutes
      workMode: String,
      location: {
        lat: Number,
        lng: Number,
      },
    }
  ],
  note: {
    type: String,
  },
}, {
  timestamps: true,
});

const Attendance = models.Attendance || model('Attendance', AttendanceSchema);

export default Attendance;
