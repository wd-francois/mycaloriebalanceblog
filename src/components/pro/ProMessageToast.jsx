import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const AUTO_DISMISS_MS = 6000;

// Watches unread message notifications and surfaces a toast the moment a new
// one arrives — the badge-only approach (a small dot in a corner) requires
// the coach/client to notice and go looking; this makes a new message
// self-announce instead, for both sighted users (visible toast) and screen
// reader users (role="status" is a live region, announced automatically).
export default function ProMessageToast({ activeTab, onView }) {
  const notifCounts    = useQuery(api.notifications.getUnreadCounts);
  const conversations  = useQuery(api.messages.listConversations);

  const [toast, setToast]   = useState(null); // { name, preview }
  const [visible, setVisible] = useState(false); // drives the enter transition
  const prevCountRef    = useRef(null);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    const unreadMsgs = notifCounts?.byType?.messages;
    if (unreadMsgs === undefined) return;

    // Seed on first load without toasting for pre-existing unread messages.
    if (prevCountRef.current === null) {
      prevCountRef.current = unreadMsgs;
      return;
    }

    if (unreadMsgs > prevCountRef.current && activeTab !== 'messages') {
      const latest = conversations?.[0]; // listConversations is sorted most-recent-first
      if (latest) {
        setToast({
          contactId: latest.id,
          name: latest.name || latest.email || 'Someone',
          preview: latest.lastMessagePreview,
        });
      }
    }
    prevCountRef.current = unreadMsgs;
  }, [notifCounts?.byType?.messages, activeTab]);

  useEffect(() => {
    if (!toast) { setVisible(false); return; }
    // Mount hidden, then flip to visible next frame so the transition runs.
    const raf = requestAnimationFrame(() => setVisible(true));
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(dismissTimerRef.current); };
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 motion-reduce:transition-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {toast.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">New message from {toast.name}</p>
          {toast.preview && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{toast.preview}</p>
          )}
          <button
            type="button"
            onClick={() => { onView?.(toast.contactId); setToast(null); }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1.5"
          >
            View
          </button>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss notification"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 -mt-0.5 -mr-0.5 w-6 h-6 flex items-center justify-center"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
