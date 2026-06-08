import { useState } from 'react';

interface InfoTipProps {
  text: string;
}

export function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="group/info relative ml-1 inline-flex align-middle">
      <button
        type="button"
        tabIndex={-1}
        aria-label="More information"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-300/80 bg-slate-100/80 text-[10px] italic leading-none text-slate-600"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-white/40 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-lg backdrop-blur-md sm:max-w-xs ${
          open ? 'block' : 'hidden group-hover/info:block group-focus-within/info:block'
        }`}
      >
        {text}
      </span>
    </span>
  );
}

interface FieldLabelProps {
  label: string;
  tip?: string;
  className?: string;
}

export function FieldLabel({ label, tip, className = '' }: FieldLabelProps) {
  return (
    <span className={`inline-flex items-center text-sm text-slate-600 ${className}`}>
      {label}
      {tip ? <InfoTip text={tip} /> : null}
    </span>
  );
}
