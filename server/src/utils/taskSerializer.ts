type TaskUserRef = {
  _id?: unknown;
  id?: string;
  name?: string;
  email?: string;
};

function normalizeUserRef(value: unknown): TaskUserRef | string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const user = value as TaskUserRef;
  const id =
    typeof user.id === 'string' && user.id
      ? user.id
      : user._id != null
        ? String(user._id)
        : '';

  if (!id) return '';

  return {
    ...user,
    _id: id,
    id,
    name: user.name ?? '',
    email: user.email ?? '',
  };
}

export function serializeTask(task: {
  toObject?: (options?: { virtuals?: boolean }) => Record<string, unknown>;
}): Record<string, unknown> {
  const raw =
    typeof task.toObject === 'function'
      ? task.toObject({ virtuals: true })
      : (task as Record<string, unknown>);

  return {
    ...raw,
    _id: String(raw._id),
    assignee: normalizeUserRef(raw.assignee),
    createdBy: normalizeUserRef(raw.createdBy),
  };
}
