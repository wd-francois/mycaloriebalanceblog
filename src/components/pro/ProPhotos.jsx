import { useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── Upload form ───────────────────────────────────────────────────────────────
function UploadForm({ onClose }) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto         = useMutation(api.photos.save);

  const [preview,  setPreview]  = useState(null);  // object URL for <img>
  const [file,     setFile]     = useState(null);
  const [caption,  setCaption]  = useState('');
  const [date,     setDate]     = useState(todayStr());
  const [status,   setStatus]   = useState('idle'); // idle | uploading | done | error
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    try {
      // 1. Get a one-time upload URL from Convex storage
      const uploadUrl = await generateUploadUrl();

      // 2. POST the raw file directly to Convex storage
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();

      // 3. Save the metadata record
      await savePhoto({
        storageId,
        date,
        caption: caption.trim() || undefined,
      });

      setStatus('done');
      setTimeout(onClose, 700);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Add Photo</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* File picker / preview area */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-xl object-cover max-h-64"
          />
          <button
            onClick={() => { setPreview(null); setFile(null); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-sm font-medium">Tap to choose or take a photo</span>
        </button>
      )}

      {/* Hidden file input — accept images, allow camera on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        className={INPUT}
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Caption (optional)"
      />

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</label>
        <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'done'}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
            status === 'done'
              ? 'bg-green-500 text-white'
              : status === 'error'
              ? 'bg-red-500 text-white'
              : !file || status === 'uploading'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm'
          }`}
        >
          {status === 'uploading' ? 'Uploading…' : status === 'done' ? '✓ Saved!' : status === 'error' ? 'Error — retry' : 'Save Photo'}
        </button>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img
        src={photo.url}
        alt={photo.caption ?? 'Photo'}
        className="max-w-full max-h-[80vh] object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
      {photo.caption && (
        <p className="mt-3 text-white/80 text-sm text-center max-w-xs">{photo.caption}</p>
      )}
      <p className="mt-1 text-white/40 text-xs">{photo.date}</p>
    </div>
  );
}

// ── Main gallery ──────────────────────────────────────────────────────────────
export default function ProPhotos() {
  const photos    = useQuery(api.photos.list, {}) ?? [];
  const removePhoto = useMutation(api.photos.remove);

  const [showUpload,  setShowUpload]  = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);

  // Group by date for section headers
  const grouped = photos.reduce((acc, p) => {
    (acc[p.date] ??= []).push(p);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const confirmDelete = async (id) => {
    await removePhoto({ id });
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="pt-4 px-1 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Photos</h1>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Add Photo
        </button>
      </div>

      {/* Upload form (inline, collapsible) */}
      {showUpload && (
        <UploadForm onClose={() => setShowUpload(false)} />
      )}

      {/* Gallery */}
      {photos.length === 0 && !showUpload ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📷</p>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No photos yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tap "Add Photo" to upload your first one</p>
        </div>
      ) : (
        dates.map(date => (
          <div key={date}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{date}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {grouped[date].map(photo => (
                <div key={photo._id} className="relative group aspect-square">
                  <img
                    src={photo.url ?? ''}
                    alt={photo.caption ?? 'Photo'}
                    className="w-full h-full object-cover rounded-xl cursor-pointer"
                    onClick={() => setLightbox(photo)}
                  />
                  {/* Delete button — shows on hover / long-press */}
                  <button
                    onClick={() => setDeleteId(photo._id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label="Delete photo"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  {/* Caption overlay */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-white text-[10px] leading-tight truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Delete photo?</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
