import { useState, useEffect, useRef } from 'react';
import { ConvexReactClient, useQuery } from 'convex/react';
import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

function proNavigate(tab) {
  window.dispatchEvent(new CustomEvent('pro:navigate', { detail: tab }));
}

function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')));
  } catch { return null; }
}

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

const StarIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

function ProNavInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const token = useAuthToken();
  const user         = useQuery(api.users.viewer);
  const role         = useQuery(api.coaches.getRole);
  const notifCounts  = useQuery(api.notifications.getUnreadCounts) ?? { byType: { messages: 0, comments: 0 } };

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click / tap
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  // Ghost avatar while resolving
  if (isLoading || (isAuthenticated && user === undefined)) {
    return (
      <span
        data-pro-nav="true"
        aria-hidden="true"
        className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 opacity-40 select-none pointer-events-none flex-shrink-0"
      />
    );
  }

  if (isAuthenticated) {
    const tokenPayload = token ? decodeJwtPayload(token) : null;
    const email   = user?.email ?? tokenPayload?.email ?? '';
    const name    = user?.name  ?? '';
    const initial = name ? name[0].toUpperCase() : email ? email[0].toUpperCase() : 'P';

    return (
      <div ref={ref} data-pro-nav="true" className="relative flex items-center gap-2 flex-shrink-0">

        {/* Messages shortcut — clients only */}
        {role === 'client' && (
          <button
            type="button"
            onClick={() => proNavigate('messages')}
            title="Messages"
            className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {notifCounts.byType.messages > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>
        )}

        {/* ★ Pro badge — hidden on very small screens */}
        <span className="hidden xs:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white pointer-events-none select-none">
          <StarIcon className="w-3 h-3" />
          Pro
        </span>

        {/* Avatar button */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label="Account menu"
          aria-expanded={open}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-900 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 focus:outline-none focus:ring-blue-400"
        >
          {initial}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-[200] w-56">
            {/* Arrow */}
            <div className="absolute right-3.5 -top-1.5 w-3 h-3 rotate-45 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700" />
            {/* Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Signed in as</p>
              {name && (
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{name}</p>
              )}
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{email || 'Pro user'}</p>

              {/* Badges */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[10px] font-bold">
                  <StarIcon className="w-2.5 h-2.5" />
                  Pro
                </span>
                {role && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-semibold capitalize">
                    {role}
                  </span>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => { signOut(); setOpen(false); }}
                  className="w-full text-left text-xs font-semibold text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not signed in — show Upgrade button
  return (
    <a
      data-pro-nav="true"
      href="/pro/"
      className="inline-flex items-center gap-1 flex-shrink-0 px-2.5 py-1 text-[11px] font-bold transition-all duration-200 rounded-lg group bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 hover:shadow-md"
      aria-label="Go to Pro"
    >
      <StarIcon className="w-3 h-3 transition-all duration-200 group-hover:scale-110" />
      <span>Pro</span>
    </a>
  );
}

export default function ProNavStatus() {
  return (
    <ConvexAuthProvider client={convex}>
      <ProNavInner />
    </ConvexAuthProvider>
  );
}
