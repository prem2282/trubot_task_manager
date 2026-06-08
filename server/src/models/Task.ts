import mongoose, { Document, Schema, Types } from 'mongoose';
import { TaskPriority, TaskStatus } from '../types';

export interface ITaskComment {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  statusChange?: TaskStatus;
  createdAt: Date;
}

export interface ITask extends Document {
  accountId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Types.ObjectId;
  createdBy: Types.ObjectId;
  dueDate?: Date;
  comments: ITaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

const taskCommentSchema = new Schema<ITaskComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    statusChange: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'reopened', 'closed'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const taskSchema = new Schema<ITask>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'reopened', 'closed'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date },
    comments: { type: [taskCommentSchema], default: [] },
  },
  { timestamps: true }
);

taskSchema.index({ workspaceId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, assignee: 1, status: 1 });
taskSchema.index({ workspaceId: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
