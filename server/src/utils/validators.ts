import { z } from 'zod';

const optionalTrimmedString = (min: number, max: number, label: string) =>
  z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(min, `${label} must be at least ${min} characters`)
      .max(max, `${label} must be at most ${max} characters`)
      .optional()
  );

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  accountName: optionalTrimmedString(2, 200, 'Account name'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const switchContextSchema = z.object({
  accountId: z.string().length(24),
  workspaceId: z.string().length(24),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const createInviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  name: z.string().min(2).max(100).optional(),
  workspaceId: z.string().length(24).optional(),
});

export const acceptInviteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(200),
});

export const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(200),
});

export const addMemberSchema = z.object({
  userId: z.string().length(24),
});

export const updateMemberRoleSchema = z.object({
  workspaceRole: z.enum(['admin', 'member']),
});

const taskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'reopened', 'closed']);
const assigneeStatusSchema = z.enum(['todo', 'in_progress', 'done']);

function assertNotPastDueDate(value: string | undefined, ctx: z.RefinementCtx) {
  if (!value) return;
  const due = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Due date cannot be in the past' });
  }
}

export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    status: assigneeStatusSchema.optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee: z.string().length(24).optional(),
    dueDate: z.string().optional(),
  })
  .superRefine((data, ctx) => assertNotPastDueDate(data.dueDate, ctx));

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: taskStatusSchema.optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee: z.string().length(24).optional(),
    dueDate: z.string().optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .superRefine((data, ctx) => assertNotPastDueDate(data.dueDate, ctx));

export const addTaskCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment is required').max(2000),
});

export const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assignee: z.string().length(24).optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.enum(['dueDate', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
