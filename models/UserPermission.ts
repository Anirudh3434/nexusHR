import { Schema, model, models } from 'mongoose';

/**
 * Per-user (individual employee) permission overrides.
 *
 * Layered on top of role permissions: defaults -> company role overrides
 * (RolePermission) -> per-user overrides (this collection).
 * Only cells that differ from the user's effective ROLE permissions are
 * stored — absence of a document means "inherit from role".
 * `super_admin` users are platform-level and can never be overridden.
 */
const UserPermissionSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company linkage is required'],
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User linkage is required'],
    index: true,
  },
  module: {
    type: String,
    required: [true, 'Module is required'],
  },
  permissions: {
    type: [String],
    enum: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
    default: [],
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

UserPermissionSchema.index({ companyId: 1, userId: 1, module: 1 }, { unique: true });

const UserPermission = models.UserPermission || model('UserPermission', UserPermissionSchema);

export default UserPermission;
