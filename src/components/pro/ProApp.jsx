import { useState } from 'react';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

import SignInPage from './SignInPage';
import ProHome from './ProHome';
import ProHistory from './ProHistory';
import ProInsights from './ProInsights';
import ProSettings from './ProSettings';
import { ProTopBar, ProBottomNav } from './ProNavigation';

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

function ProShell() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [page, setPage] = useState('home');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <SignInPage />;

  return <ProMain page={page} onNavigate={setPage} />;
}

function ProMain({ page, onNavigate }) {
  const settings = useQuery(api.userSettings.get);

  return (
    <div className="relative">
      <ProTopBar />
      <main>
        {page === 'home' && <ProHome settings={settings} />}
        {page === 'entries' && <ProHistory />}
        {page === 'insights' && <ProInsights settings={settings} />}
        {page === 'settings' && <ProSettings />}
      </main>
      <ProBottomNav activePage={page} onNavigate={onNavigate} />
    </div>
  );
}

export default function ProApp() {
  return (
    <ConvexAuthProvider client={convex}>
      <ProShell />
    </ConvexAuthProvider>
  );
}
