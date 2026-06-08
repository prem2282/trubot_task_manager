import mongoose, { Document, Schema, Types } from 'mongoose';
import { AccountRole, MembershipStatus } from '../types';

export interface IAccountMembership extends Document {
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  accountRole: AccountRole;
  status: MembershipStatus;
  createdAt: Date;
}

const accountMembershipSchema = new Schema<IAccountMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountRole: { type: String, enum: ['admin', 'member'], required: true },
    status: { type: String, enum: ['verified', 'unverified'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

accountMembershipSchema.index({ userId: 1, accountId: 1 }, { unique: true });
accountMembershipSchema.index({ accountId: 1, status: 1 });

export const AccountMembership = mongoose.model<IAccountMembership>(
  'AccountMembership',
  accountMembershipSchema
);
