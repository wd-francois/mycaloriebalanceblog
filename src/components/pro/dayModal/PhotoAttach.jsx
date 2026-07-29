import { useState, useRef, useEffect } from 'react';

// ── Photo attachment ──────────────────────────────────────────────────────────
export default function PhotoAttach({ file, setFile }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const remove = () => {
    setFile(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const DASHED_BTN = 'flex flex-col items-center justify-center gap-2 flex-1 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all';

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Photo (optional)</p>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={preview} alt="Preview" className="w-full h-44 object-cover" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            aria-label="Remove photo"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button type="button" onClick={() => cameraRef.current?.click()} className={DASHED_BTN}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-xs font-medium">Attach a photo</span>
          </button>
          <button type="button" onClick={() => uploadRef.current?.click()} className={DASHED_BTN}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="text-xs font-medium">Upload</span>
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
