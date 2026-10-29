import mongoose, { Schema, model, models } from 'mongoose';

/**
 * One short-lived card per recipient, shown in the login celebration and
 * counted as unread until the user opens it. Recipients are resolved when the
 * event happens (by role or explicitly), so role rules live in the event
 * handler rather than in every read query.
 */
export const NOTIFICATION_KINDS = [
  'leave',
  'resignation',
  'ticket',
  'task',
  'payroll',
  'expense',
  'announcement',
  'system',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const NotificationSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    kind: {
      type: String,
      enum: NOTIFICATION_KINDS,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    href: {
      type: String,
      required: true,
    },
    meta: {
      type: String,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
    },
    /** Stable key so a retried request cannot create the same card twice. */
    dedupeKey: {
      type: String,
    },
    readAt: {
      type: Date,
    },
    celebrationSeenAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, celebrationSeenAt: 1, createdAt: -1 });
NotificationSchema.index({ companyId: 1, kind: 1, createdAt: -1 });
NotificationSchema.index(
  { recipientId: 1, dedupeKey: 1 },
  { unique: true, sparse: true }
);

const Notification =
  models.Notification || model('Notification', NotificationSchema);

export default Notification;
