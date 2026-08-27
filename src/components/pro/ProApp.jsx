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

const SETTINGS_CACHE_KEY = 'mcb_pro_settings_cache';
const SETTINGS_GRACE_MS = 1500;
// Written by the Original app's Calorie Calculator (src/pages/calorie-calculator.astro)
// when a Goal Recommendation card is picked — see the effect in ProShell below.
const PENDING_CALORIE_GOAL_KEY = 'mcb_pending_pro_calorie_goal';

// userSettings.get can transiently *resolve* to null right after a fresh
// subscription starts (e.g. after Home -> Messages -> Home, or after
// logging out and back in) — the client-side auth state can report "ready"
// slightly before the server-side query has actually been re-evaluated with
// that identity, especially over a slow mobile connection. So a falsy
// resolution is never trusted as final on its own.
//
// Note this null is indistinguishable, at the client, from a genuinely new
// user who has no settings row yet — both come back as plain `null`. That
// ambiguity used to cause real data loss: ProSettings populated its form
// fields from this query, and if a user submitted while it had transiently
// resolved null (not just still loading), it would send calorieGoal:
// undefined for a goal that actually existed, and Convex's db.patch()
// treats an explicit undefined as "clear this field" — silently wiping it.
//
// The first version of this fix used a single grace-period timer that
// started on mount and flipped permanently "expired" ~1.5s later. That
// meant it only ever protected the first second and a half of the whole
// page's life: by the time a user had actually navigated to Messages and
// back (or logged back in, in the same page session), the timer had long
// since expired and offered no protection at all against the very race it
// was meant to cover.
//
// Instead: once we've ever seen a real settings row in this page session,
// remember it in a ref for as long as ProShell is mounted (it survives tab
// switches and logging back in, since neither remounts ProShell) and never
// let a later falsy resolution override it. localStorage backs that up
// across actual page reloads. Only when nothing has ever been seen at all —
// no live row, no remembered ref, no cache — do we conclude "genuinely no
// row yet" (a real new-user state, safe to treat as empty), and even then
// only after a grace period, measured from when *that* uncertainty began
// rather than from mount, so it isn't a one-shot clock that's already spent
// by the time it's needed. Returns undefined while still deciding, null
// once confirmed there's truly no row, or the settings object once known.
function useSettledUserSettings() {
  const liveSettings = useQuery(api.userSettings.get);
  const rememberedRef = useRef(null);
  const uncertainSinceRef = useRef(null);
  const [, retryTick] = useState(0);

  useEffect(() => {
    if (liveSettings || rememberedRef.current) return;
    let cached = null;
    try { cached = localStorage.getItem(SETTINGS_CACHE_KEY); } catch {}
    if (cached) return;

    if (uncertainSinceRef.current === null) uncertainSinceRef.current = Date.now();
    const elapsed = Date.now() - uncertainSinceRef.current;
    if (elapsed >= SETTINGS_GRACE_MS) return;

    const timer = setTimeout(() => retryTick(t => t + 1), SETTINGS_GRACE_MS - elapsed);
    return () => clearTimeout(timer);
  });

  if (liveSettings) {
    rememberedRef.current = liveSettings;
    uncertainSinceRef.current = null;
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(liveSettings)); } catch {}
    return liveSettings;
  }

  if (rememberedRef.current) return rememberedRef.current;

  let cached = null;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {}
  if (cached) {
    rememberedRef.current = cached;
    return cached;
  }

  if (uncertainSinceRef.current === null) uncertainSinceRef.current = Date.now();
  const elapsed = Date.now() - uncertainSinceRef.current;
  return elapsed >= SETTINGS_GRACE_MS ? null : undefined;
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
  const claimInvites = useMutation(api.coaches.claimPendingInvites);
  const saveGoals    = useMutation(api.userSettings.set);

  const role = useProRole();
  const settledSettings = useSettledUserSettings();
  // undefined (still deciding) passes straight through so ProHome can show
  // a neutral loading state instead of "no goal set"; null/an object both
  // mean settledSettings has been confirmed one way or the other.
  const calorieGoal = settledSettings === undefined ? undefined : (settledSettings?.calorieGoal ?? null);

  // The Original app's Calorie Calculator (linked from Pro's Tools page)
  // has no Convex/auth context of its own, so picking a goal there just
  // queues the number in localStorage — apply it here as soon as we have
  // an authenticated Pro session. Passing only `calorieGoal` (not the other
  // optional fields) means Convex leaves proteinGoal/weightGoal untouched.
  useEffect(() => {
    if (!isAuthenticated) return;
    let pending = null;
    try {
      const raw = localStorage.getItem(PENDING_CALORIE_GOAL_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch {}
    if (!pending || typeof pending.value !== 'number') return;
    saveGoals({ calorieGoal: pending.value })
      .then(() => { try { localStorage.removeItem(PENDING_CALORIE_GOAL_KEY); } catch {} })
      .catch(() => {}); // leave it queued to retry on the next load if the save failed
  }, [isAuthenticated]);

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
      case 'settings': return <ProSettings user={user} convexSettings={settledSettings} />;
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
