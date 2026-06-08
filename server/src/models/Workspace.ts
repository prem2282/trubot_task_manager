import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkspace extends Document {
  accountId: Types.ObjectId;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

workspaceSchema.index({ accountId: 1, name: 1 }, { unique: true });
workspaceSchema.index({ accountId: 1, isDefault: 1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
