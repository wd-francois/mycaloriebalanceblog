import { useState, useEffect, useRef } from 'react';
import { ConvexReactClient, useQuery, useMutation } from 'convex/react';
import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { ConvexSettingsProvider } from '../../contexts/ConvexSettingsContext';
import SignInPage    from './SignInPage';
import ProNavigation from './ProNavigation';
import ProHome       from './ProHome';
import ProInsights   from './ProInsights';
import ProTools      from './ProTools';
import ProPhotos     from './ProPhotos';
import ProSettings   from './ProSettings';
import ProClients    from './ProClients';
import ProClientDetail from './ProClientDetail';
import ProMessages   from './ProMessages';
import ProMessageToast from './ProMessageToast';
import ProPrograms   from './ProPrograms';
import ProHelp       from './ProHelp';
import ProErrorBoundary from './ProErrorBoundary';
import { useProRole } from './useProRole';

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

const VALID_TABS = ['home', 'insights', 'tools', 'photos', 'clients', 'programs', 'messages', 'help', 'settings'];

const CALORIE_GOAL_KEY = 'mcb_pro_calorie_goal';

// ProHome used to run its own userSettings.get subscription, which was torn
// down and recreated every time it remounted on tab switches (see the
// key={tab} below) — and a fresh subscription could transiently *resolve*
// to null (an auth-token race), not just stay loading, causing the card to
// flash to "Set your goal" on every Home -> Messages -> Home trip. Fetching
// it once here, where it's never torn down, avoids re-triggering that race.
// Still only trust a truthy goal for display/caching, in case a long-lived
// subscription ever re-evaluates transiently wrong too (e.g. on a token
// refresh) — mirrors the same defensive pattern already used for role in
// useProRole.js.
function resolveCachedCalorieGoal(settings) {
  const goal = settings?.calorieGoal;
  if (goal) {
    try { localStorage.setItem(CALORIE_GOAL_KEY, String(goal)); } catch {}
    return goal;
  }
  try {
    const cached = localStorage.getItem(CALORIE_GOAL_KEY);
    return cached ? Number(cached) : null;
  } catch { return null; }
}

// Lets other pages deep-link straight into a tab (e.g. the top-nav Messages
// shortcut, which does a real page navigation when it isn't already on /pro/).
function initialTabFromURL() {
  try {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return VALID_TABS.includes(requested) ? requested : 'home';
  } catch { return 'home'; }
}

// ---------------------------------------------------------------------------

function ProShell() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user        = useQuery(api.users.viewer);
  const settings     = useQuery(api.userSettings.get);
  const claimInvites = useMutation(api.coaches.claimPendingInvites);

  const role = useProRole();
  const calorieGoal = resolveCachedCalorieGoal(settings);

  const [tab,            setTab]            = useState(initialTabFromURL);
  const [selectedClient, setSelectedClient] = useState(null);

  // Drop ?tab= from the URL once consumed so it doesn't stick around across
  // in-app navigation or get bookmarked/shared.
  useEffect(() => {
    if (!window.location.search.includes('tab=')) return;
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  function navigate(newTab) {
    setSelectedClient(null);
    setTab(newTab);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    claimInvites();
  }, [isAuthenticated]);

  const prevRoleRef = useRef(null);
  useEffect(() => {
    if (role && prevRoleRef.current !== null && prevRoleRef.current !== role) {
      navigate('home');
    }
    if (role) prevRoleRef.current = role;
  }, [role]);

  useEffect(() => {
    const handler = (e) => {
      setSelectedClient(null);
      setTab(e.detail);
    };
    window.addEventListener('pro:navigate', handler);
    return () => window.removeEventListener('pro:navigate', handler);
  }, [setSelectedClient, setTab]);

  // ── Loading splash ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) return <SignInPage />;

  // ── Tab renderer ────────────────────────────────────────────────────────
  function renderTab() {
    if (tab === 'clients' && selectedClient) {
      return (
        <ProClientDetail
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
        />
      );
    }
    switch (tab) {
      case 'home':     return <ProHome     onNavigate={navigate} calorieGoal={calorieGoal} />;
      case 'insights': return <ProInsights />;
      case 'tools':    return <ProTools />;
      case 'photos':   return <ProPhotos />;
      case 'clients':  return <ProClients  onSelectClient={setSelectedClient} />;
      case 'programs': return <ProPrograms />;
      case 'messages': return <ProMessages />;
      case 'help':     return <ProHelp onBack={() => navigate('settings')} />;
      case 'settings': return <ProSettings user={user} />;
      default:         return <ProHome     onNavigate={navigate} calorieGoal={calorieGoal} />;
    }
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20 px-4 lg:pb-4 lg:pl-24 xl:pl-60">
      <ProErrorBoundary
        key={tab}
        fallback={
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Something went wrong loading this page.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400"
            >
              Reload
            </button>
          </div>
        }
      >
        {renderTab()}
      </ProErrorBoundary>
      <ProErrorBoundary>
        <ProMessageToast activeTab={tab} onView={() => navigate('messages')} />
      </ProErrorBoundary>
      <ProNavigation
        active={tab}
        role={role}
        onNavigate={navigate}
      />
    </div>
  );
}

export default function ProApp() {
  return (
    <ConvexAuthProvider client={convex}>
      <ConvexSettingsProvider>
        <ProShell />
      </ConvexSettingsProvider>
    </ConvexAuthProvider>
  );
}
