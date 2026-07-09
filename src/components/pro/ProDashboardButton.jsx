import { ConvexReactClient, useQuery } from 'convex/react';
import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

const ROLE_KEY = 'mcb_pro_role';

function DashboardButtonInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const serverRole = useQuery(api.coaches.getRole);

  let cachedRole = null;
  try { cachedRole = localStorage.getItem(ROLE_KEY); } catch {}
  const role = serverRole ?? cachedRole;

  // Only coaches get this shortcut — clients don't have the same
  // "stuck outside the dashboard" problem this button solves.
  if (isLoading || !isAuthenticated || role !== 'coach') return null;

  return (
    <a
      href="/pro/"
      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
      aria-label="Coach Dashboard"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
      <span>Coach Dashboard</span>
    </a>
  );
}

export default function ProDashboardButton() {
  return (
    <ConvexAuthProvider client={convex}>
      <DashboardButtonInner />
    </ConvexAuthProvider>
  );
}
