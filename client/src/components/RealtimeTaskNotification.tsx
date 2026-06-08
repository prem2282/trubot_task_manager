import { useRealtimeNotificationStore } from '../store/realtimeNotificationStore';

export default function RealtimeTaskNotification() {
  const message = useRealtimeNotificationStore((s) => s.message);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg"
    >
      {message}
    </div>
  );
}
