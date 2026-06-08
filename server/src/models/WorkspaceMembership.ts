import mongoose, { Document, Schema, Types } from 'mongoose';
import { MembershipStatus, WorkspaceRole } from '../types';

export interface IWorkspaceMembership extends Document {
  userId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  workspaceRole: WorkspaceRole;
  status: MembershipStatus;
  createdAt: Date;
}

const workspaceMembershipSchema = new Schema<IWorkspaceMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    workspaceRole: { type: String, enum: ['admin', 'member'], required: true },
    status: { type: String, enum: ['verified', 'unverified'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

workspaceMembershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
workspaceMembershipSchema.index({ workspaceId: 1, status: 1 });

export const WorkspaceMembership = mongoose.model<IWorkspaceMembership>(
  'WorkspaceMembership',
  workspaceMembershipSchema
);
