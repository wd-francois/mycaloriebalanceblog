import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function relativeTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Shared thread (used by clients + coaches inside ProClientDetail) ──────────

export function CoachThread({ otherUserId, otherName, onBack }) {
  const viewer      = useQuery(api.users.viewer);
  const messages    = useQuery(api.messages.list, otherUserId ? { otherUserId } : 'skip') ?? [];
  const sendMsg     = useMutation(api.messages.send);
  const genUpload   = useMutation(api.messages.generateUploadUrl);
  const removeMsg   = useMutation(api.messages.remove);
  const markRead    = useMutation(api.notifications.markReadForClient);

  // Mark this conversation's notifications as read when thread opens
  useEffect(() => {
    if (otherUserId) markRead({ clientId: otherUserId });
  }, [otherUserId]);

  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef   = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !otherUserId) return;
    setSending(true);
    setError('');
    try {
      await sendMsg({ receiverId: otherUserId, text: text.trim() });
      setText('');
    } catch (err) {
      setError(err.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !otherUserId) return;
    setUploading(true);
    setError('');
    try {
      const uploadUrl = await genUpload({});
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      await sendMsg({ receiverId: otherUserId, storageId, fileName: file.name, fileType: file.type });
    } catch (err) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const myId    = viewer?._id;
  const isImage = (ft) => ft?.startsWith('image/');

  return (
    <div className="flex flex-col gap-3">
      {onBack && (
        <div className="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{otherName}</p>
        </div>
      )}

      {/* Message list — role="log" + aria-live so new messages are announced
          to screen reader users without them needing to re-focus the region */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={otherName ? `Conversation with ${otherName}` : 'Conversation'}
        className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto py-1"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">No messages yet</p>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === myId;
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'}`}>
                {msg.url && isImage(msg.fileType) && (
                  <img
                    src={msg.url}
                    alt={msg.fileName ?? 'Image'}
                    className="rounded-xl max-w-[200px] mb-1 cursor-pointer"
                    onClick={() => window.open(msg.url, '_blank')}
                  />
                )}
                {msg.url && !isImage(msg.fileType) && (
                  <a
                    href={msg.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-1.5 text-xs underline mb-1 ${isMine ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    {msg.fileName ?? 'File'}
                  </a>
                )}
                {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                {isMine && (
                  <button
                    onClick={() => removeMsg({ id: msg._id })}
                    aria-label="Delete message"
                    className={`block ml-auto text-[10px] mt-0.5 opacity-40 hover:opacity-80 transition-opacity ${isMine ? 'text-white' : 'text-gray-500'}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-col gap-2">
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 items-center">
          <label htmlFor="pro-message-input" className="sr-only">Message</label>
          <input
            id="pro-message-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Message…"
            className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Attach file"
            aria-label="Attach file"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            )}
          </button>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={handleFile}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
      </form>
    </div>
  );
}

// ── Messages home (works for both coaches and clients) ────────────────────────
// Backed by messages.listConversations, which is role-agnostic — it just
// resolves "the other side of every coach/client relationship I have," so
// this one inbox serves a coach's client list and a client's coach list.

function ConversationItem({ conversation, onClick }) {
  const { name, email, lastMessagePreview, lastMessageAt, lastMessageMine, unreadCount } = conversation;
  const displayName = name || email || 'Unknown';
  const initial = displayName[0].toUpperCase();
  const hasUnread = unreadCount > 0;

  const previewText = lastMessagePreview
    ? `${lastMessageMine ? 'You: ' : ''}${lastMessagePreview}`
    : 'No messages yet';

  const accessibleLabel = `${displayName}${hasUnread ? `, ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : ''}. ${previewText}`;

  return (
    <button
      onClick={onClick}
      aria-label={accessibleLabel}
      className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base">
          {initial}
        </div>
        {hasUnread && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[var(--color-bg-muted)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-900 dark:text-white'}`}>
          {displayName}
        </p>
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
          {previewText}
        </p>
      </div>
      {lastMessageAt && (
        <span aria-hidden="true" className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 self-start mt-1">
          {relativeTime(lastMessageAt)}
        </span>
      )}
    </button>
  );
}

// Isolated so a query failure can't crash the whole messages screen
function ConversationList({ onSelect }) {
  const conversations = useQuery(api.messages.listConversations) ?? [];
  if (conversations.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">No conversations yet</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {conversations.map(conversation => (
        <ConversationItem key={conversation.id} conversation={conversation} onClick={() => onSelect(conversation)} />
      ))}
    </div>
  );
}

export default function ProMessages() {
  const [selectedContact, setSelectedContact] = useState(null);

  if (selectedContact) {
    return (
      <div className="w-full">
        <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <CoachThread
            otherUserId={selectedContact.id}
            otherName={selectedContact.name || selectedContact.email}
            onBack={() => setSelectedContact(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Messages</h2>
        <ConversationList onSelect={setSelectedContact} />
      </div>
    </div>
  );
}
