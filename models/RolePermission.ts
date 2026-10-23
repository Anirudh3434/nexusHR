import { Schema, model, models } from 'mongoose';

/**
 * Per-company permission overrides.
 * Only cells that differ from the hardcoded defaults in lib/permissions.ts
 * are stored — absence of a document means "use the default".
 * The `super_admin` role is platform-level and can never be customized.
 */
const RolePermissionSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company linkage is required'],
    index: true,
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'manager', 'employee'],
    required: [true, 'Role is required'],
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

RolePermissionSchema.index({ companyId: 1, role: 1, module: 1 }, { unique: true });

const RolePermission = models.RolePermission || model('RolePermission', RolePermissionSchema);

export default RolePermission;
