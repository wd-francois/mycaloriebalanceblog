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
const CALORIE_GOAL_GRACE_MS = 1500;

// ProHome used to run its own userSettings.get subscription, which was torn
// down and recreated every time it remounted on tab switches (see the
// key={tab} below), and moving it up here (a component that never remounts)
// was meant to fix a flash to "Set your goal" on Home -> Messages -> Home.
// It didn't, on mobile: a diagnostic build showed that even a component that
// never remounts can have this query transiently *resolve* to null right
// after a fresh page load — the client-side auth state (isLoading/
// isAuthenticated) can flip to "ready" slightly before the server-side query
// evaluation actually sees the identity, especially over a slow mobile
// connection. That's a real gap between "authenticated" and "this specific
// query has been re-evaluated with that identity", not something we can
// just await.
//
// So: never trust a falsy resolution as final. A truthy goal is trusted (and
// cached) immediately. A falsy one is only treated as "no goal set" after a
// short grace period with no correction — before that, and with nothing
// cached from a previous successful load, callers get `undefined` ("still
// deciding") rather than `null` ("confirmed unset"), so the UI can show a
// neutral loading state instead of flashing the wrong thing.
function useCalorieGoal(settings) {
  const [pastGrace, setPastGrace] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPastGrace(true), CALORIE_GOAL_GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  const liveGoal = settings?.calorieGoal;
  if (liveGoal) {
    try { localStorage.setItem(CALORIE_GOAL_KEY, String(liveGoal)); } catch {}
    return liveGoal;
  }

  let cached = null;
  try { cached = localStorage.getItem(CALORIE_GOAL_KEY); } catch {}
  if (cached) return Number(cached);

  return pastGrace ? null : undefined;
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
  const calorieGoal = useCalorieGoal(settings);

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
