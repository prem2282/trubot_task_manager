import { useToastStore } from '../store/toastStore';

export default function Toast() {
  const message = useToastStore((s) => s.message);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg"
    >
      {message}
    </div>
  );
}
