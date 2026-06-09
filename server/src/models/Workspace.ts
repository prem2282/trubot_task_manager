import mongoose, { Document, Schema, Types } from 'mongoose';

export type WorkspaceStatus = 'active' | 'archived';

export interface IWorkspace extends Document {
  accountId: Types.ObjectId;
  name: string;
  isDefault: boolean;
  status: WorkspaceStatus;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Workspaces visible in the UI — excludes archived. */
export const ACTIVE_WORKSPACE_FILTER = { status: { $ne: 'archived' as const } };

const workspaceSchema = new Schema<IWorkspace>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique among active workspaces only — archived names can be reused
workspaceSchema.index(
  { accountId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);
workspaceSchema.index({ accountId: 1, isDefault: 1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
