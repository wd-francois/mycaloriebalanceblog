const CheckIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CONFIG = {
  success: { icon: <CheckIcon />, bg: 'bg-gray-900 dark:bg-gray-800' },
  error:   { icon: <XIcon />,     bg: 'bg-red-600 dark:bg-red-700' },
  info:    { icon: <InfoIcon />,  bg: 'bg-blue-600 dark:bg-blue-700' },
};

function ToastItem({ toast }) {
  const { icon, bg } = CONFIG[toast.type] ?? CONFIG.success;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-toast-in flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-medium max-w-sm w-full ${bg}`}
    >
      {icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
    </div>
  );
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-24 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-50 px-4">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
