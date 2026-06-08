import mongoose, { Document, Schema } from 'mongoose';
import { VerificationStatus } from '../types';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified'],
      default: 'unverified',
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
