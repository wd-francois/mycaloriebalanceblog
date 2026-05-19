import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import SignInPage from './SignInPage';

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

function AuthGateInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-white dark:bg-[var(--color-bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[400] overflow-y-auto">
        <SignInPage />
      </div>
    );
  }

  return null;
}

export default function ProAuthGate() {
  return (
    <ConvexAuthProvider client={convex}>
      <AuthGateInner />
    </ConvexAuthProvider>
  );
}
