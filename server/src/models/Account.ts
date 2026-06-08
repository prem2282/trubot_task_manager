import mongoose, { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', accountSchema);
