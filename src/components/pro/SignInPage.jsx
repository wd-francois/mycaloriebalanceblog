import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';

export default function SignInPage() {
  const { signIn } = useAuthActions();

  const [view,     setView]     = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'reset'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [code,     setCode]     = useState('');
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (view === 'signup') {
        await signIn('password', { email, password, name, flow: 'signUp' });
      } else {
        await signIn('password', { email, password, flow: 'signIn' });
      }
    } catch (err) {
      const msg = err?.message ?? '';
      setError(
        msg.includes('Invalid') || msg.includes('incorrect')
          ? 'Invalid email or password.'
          : msg.includes('already')
          ? 'An account with this email already exists. Please sign in instead.'
          : view === 'signup' && msg.includes('Server Error')
          ? 'Could not create account — this email may already be registered. Try signing in instead.'
          : msg.includes('Server Error')
          ? 'Something went wrong. Please try again.'
          : msg || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Requesting a reset code and completing a reset both intentionally show
  // one generic message no matter what Convex Auth reports — a real email
  // and a nonexistent one, or a wrong vs. expired code, must look identical
  // so the flow can't be used to enumerate accounts.
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn('password', { flow: 'reset', email });
    } catch {
      // swallow — see comment above
    } finally {
      setLoading(false);
      setInfo("If an account exists for that email, we've sent a 6-digit code. Enter it below.");
      setView('reset');
    }
  };

  const handleResendCode = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await signIn('password', { flow: 'reset', email });
    } catch {
      // swallow — see comment above
    } finally {
      setLoading(false);
      setInfo('A new code has been sent if an account exists for that email.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await signIn('password', { flow: 'reset-verification', email, code, newPassword: password });
    } catch {
      setError('That code is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const goToSignIn = () => {
    setView('signin');
    setError('');
    setInfo('');
    setCode('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-[var(--color-bg-base)] dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Calorie Balance</h1>
          <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm mt-1">Pro</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {(view === 'signin' || view === 'signup') && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { setView('signin'); setError(''); }}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                    view === 'signin'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setView('signup'); setError(''); }}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                    view === 'signup'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {view === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    {view === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setView('forgot'); setError(''); setInfo(''); }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={view === 'signup' ? 'At least 8 characters' : '••••••••'}
                    required
                    minLength={view === 'signup' ? 8 : 1}
                    autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {error}
                      {view === 'signup' && error.includes('sign in') && (
                        <>
                          {' '}
                          <button
                            type="button"
                            onClick={() => { setView('signin'); setError(''); }}
                            className="underline font-semibold hover:text-red-900 dark:hover:text-red-300"
                          >
                            Go to Sign In
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {view === 'signup' ? 'Creating account…' : 'Signing in…'}
                    </>
                  ) : (
                    view === 'signup' ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reset your password</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter your account email and we'll send you a 6-digit code.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>

              <button
                type="button"
                onClick={goToSignIn}
                className="w-full text-center text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Back to sign in
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Enter your code</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Check your email for the 6-digit code, then choose a new password.
                </p>
              </div>

              {info && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-xl px-4 py-3 text-sm">
                  {info}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-lg tracking-[0.5em] font-mono bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={goToSignIn}
                  className="font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Your data is securely stored and syncs across all your devices.
        </p>
      </div>
    </div>
  );
}
