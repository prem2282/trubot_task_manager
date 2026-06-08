import mongoose, { Document, Schema, Types } from 'mongoose';

export type VerificationTokenType = 'email_verification' | 'password_reset';

export interface IVerificationToken extends Document {
  userId: Types.ObjectId;
  type: VerificationTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

verificationTokenSchema.index({ userId: 1, type: 1, usedAt: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken = mongoose.model<IVerificationToken>(
  'VerificationToken',
  verificationTokenSchema
);
