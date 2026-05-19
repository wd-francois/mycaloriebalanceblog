import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// ── Shared thread (used by clients + coaches inside ProClientDetail) ──────────

export function CoachThread({ otherUserId, otherName, onBack }) {
  const viewer      = useQuery(api.users.viewer);
  const messages    = useQuery(api.messages.list, otherUserId ? { otherUserId } : 'skip') ?? [];
  const sendMsg     = useMutation(api.messages.send);
  const genUpload   = useMutation(api.messages.generateUploadUrl);
  const removeMsg   = useMutation(api.messages.remove);

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

      {/* Message list */}
      <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto py-1">
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
          <input
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

// ── Client messages home ──────────────────────────────────────────────────────

function CoachListItem({ coach, onClick }) {
  const initial = (coach.name || coach.email || '?')[0].toUpperCase();
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{coach.name || coach.email}</p>
        {coach.name && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{coach.email}</p>}
      </div>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}

// Isolated so a query failure can't crash the whole messages screen
function CoachList({ onSelect }) {
  const coaches = useQuery(api.coaches.getMyCoaches) ?? [];
  if (coaches.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">No coaches linked yet</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {coaches.map(coach => (
        <CoachListItem key={coach.id} coach={coach} onClick={() => onSelect(coach)} />
      ))}
    </div>
  );
}

export default function ProMessages() {
  const [selectedCoach, setSelectedCoach] = useState(null);

  if (selectedCoach) {
    return (
      <div className="w-full">
        <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <CoachThread
            otherUserId={selectedCoach.id}
            otherName={selectedCoach.name || selectedCoach.email}
            onBack={() => setSelectedCoach(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Messages</h2>
        <CoachList onSelect={setSelectedCoach} />
      </div>
    </div>
  );
}
