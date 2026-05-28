import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';


function relativeDate(dateStr) {
  if (!dateStr) return null;
  const d    = new Date(dateStr + 'T00:00:00');
  const now  = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ProClients({ onSelectClient }) {
  const clients        = useQuery(api.coaches.getClients);
  const sentInvites    = useQuery(api.coaches.getSentInvites) ?? [];
  const unreadCounts   = useQuery(api.notifications.getUnreadCounts) ?? { total: 0, byClient: {} };
  const linkClient     = useMutation(api.coaches.linkClient);
  const unlinkClient   = useMutation(api.coaches.unlinkClient);
  const cancelInvite   = useMutation(api.coaches.cancelInvite);
  const [cancelling,   setCancelling]  = useState(null);

  const [showAdd,    setShowAdd]    = useState(false);
  const [email,      setEmail]      = useState('');
  const [linking,    setLinking]    = useState(false);
  const [linkError,  setLinkError]  = useState('');
  const [linkOk,     setLinkOk]     = useState(false);
  const [removing,   setRemoving]   = useState(null); // clientId being removed

  const handleLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLinking(true);
    setLinkError('');
    setLinkOk(false);
    try {
      await linkClient({ email: email.trim().toLowerCase() });
      setLinkOk(true);
      setEmail('');
      setTimeout(() => { setLinkOk(false); setShowAdd(false); }, 1500);
    } catch (err) {
      setLinkError(err.message ?? 'Failed to add client');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (clientId) => {
    setRemoving(clientId);
    try {
      await unlinkClient({ clientId });
    } finally {
      setRemoving(null);
    }
  };

  if (clients === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Clients</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(v => !v); setLinkError(''); setEmail(''); setLinkOk(false); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              showAdd
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {showAdd ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add client
              </>
            )}
          </button>
        </div>

        {/* Add client form */}
        {showAdd && (
          <form
            onSubmit={handleLink}
            className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Add client by email
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              The client must already have a Pro account.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setLinkError(''); }}
                placeholder="client@email.com"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!email.trim() || linking}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                  linkOk
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'
                }`}
              >
                {linking ? '…' : linkOk ? '✓' : 'Add'}
              </button>
            </div>
            {linkError && (
              <p className="text-xs text-red-500 dark:text-red-400">{linkError}</p>
            )}
          </form>
        )}

        {/* Pending invites */}
        {sentInvites.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
              Awaiting response
            </p>
            {sentInvites.map(invite => {
              const displayName = invite.name || invite.email || 'Unknown';
              const initial = displayName[0].toUpperCase();
              return (
                <div key={invite.id} className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-base flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Pending
                      </span>
                      {!invite.signedUp && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Not signed up yet
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setCancelling(invite.id);
                      try { await cancelInvite({ inviteId: invite.id }); }
                      finally { setCancelling(null); }
                    }}
                    disabled={cancelling === invite.id}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    {cancelling === invite.id ? '…' : 'Cancel'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Client list */}
        {clients.length === 0 ? (
          <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No clients yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Use the <strong>Add client</strong> button above to link a client by their email.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((client) => {
              const initial     = (client.name || client.email || '?')[0].toUpperCase();
              const displayName = client.name || client.email || 'Unknown client';
              const lastSeen    = relativeDate(client.lastActiveDate);
              const clientNotifs = unreadCounts.byClient[client.id] ?? { entries: 0, messages: 0 };

              return (
                <div
                  key={client.id}
                  className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 px-4 py-3 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {initial}
                  </div>

                  {/* Name / email / last active */}
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => onSelectClient(client)}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.name && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{client.email}</p>
                      )}
                      {lastSeen && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          lastSeen === 'Today'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : lastSeen === 'Yesterday'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {lastSeen}
                        </span>
                      )}
                      {clientNotifs.entries > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                          New entry
                        </span>
                      )}
                      {clientNotifs.messages > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                          New msg
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Chevron + remove */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUnlink(client.id)}
                      disabled={removing === client.id}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all disabled:opacity-30"
                      title="Remove client"
                    >
                      {removing === client.id
                        ? <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10H2M16 14l-4-4-4 4M12 6v4" />
                          </svg>
                      }
                    </button>
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                      onClick={() => onSelectClient(client)} style={{ cursor: 'pointer' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
