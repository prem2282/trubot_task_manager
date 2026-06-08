export type RealtimeTaskEvent = 'created' | 'updated' | 'deleted';

export function realtimeTaskMessage(type: RealtimeTaskEvent, taskTitle: string): string {
  switch (type) {
    case 'created':
      return `New task: ${taskTitle}`;
    case 'updated':
      return `Task updated: ${taskTitle}`;
    case 'deleted':
      return `Task deleted: ${taskTitle}`;
  }
}
