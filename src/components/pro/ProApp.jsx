import { useState, useEffect, useRef } from 'react';
import { ConvexReactClient, useQuery } from 'convex/react';
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

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

// ---------------------------------------------------------------------------
// Role helper — reads/writes a localStorage cache so the nav is stable on
// remount while the Convex query is still in-flight.
// ---------------------------------------------------------------------------
const ROLE_KEY = 'mcb_pro_role';

function resolveRole(serverRole) {
  if (serverRole) {
    try { localStorage.setItem(ROLE_KEY, serverRole); } catch {}
    return serverRole;
  }
  try { return localStorage.getItem(ROLE_KEY); } catch { return null; }
}

// ---------------------------------------------------------------------------

function ProShell() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user       = useQuery(api.users.viewer);
  const serverRole = useQuery(api.coaches.getRole);

  const role = resolveRole(serverRole);

  const [tab,            setTab]            = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);

  function navigate(newTab) {
    setSelectedClient(null);
    setTab(newTab);
  }

  // Reset to home when role changes (e.g. client→coach) so the nav stays consistent.
  const prevRoleRef = useRef(null);
  useEffect(() => {
    if (role && prevRoleRef.current !== null && prevRoleRef.current !== role) {
      navigate('home');
    }
    if (role) prevRoleRef.current = role;
  }, [role]);

  // Listen for navigation events dispatched from the top-nav ProNavStatus island.
  // Use setters directly — they are stable references, so no stale-closure risk.
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
      case 'home':     return <ProHome     onNavigate={navigate} role={role} />;
      case 'insights': return <ProInsights />;
      case 'tools':    return <ProTools />;
      case 'photos':   return <ProPhotos />;
      case 'clients':  return <ProClients  onSelectClient={setSelectedClient} />;
      case 'messages': return <ProMessages />;
      case 'settings': return <ProSettings user={user} />;
      default:         return <ProHome     onNavigate={navigate} />;
    }
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20 px-4">
      {renderTab()}
      <ProNavigation
        active={tab}
        role={role}
        onNavigate={(t) => navigate(t)}
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
