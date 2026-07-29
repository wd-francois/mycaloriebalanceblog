import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useConvexSettings } from '../../contexts/ConvexSettingsContext';
import PhotoAttach from './dayModal/PhotoAttach';
import MealForm from './dayModal/MealForm';
import ExerciseLogForm from './dayModal/ExerciseLogForm';
import SleepForm from './dayModal/SleepForm';
import MeasurementsForm from './dayModal/MeasurementsForm';
import EntryCard from './dayModal/EntryCard';

// ── Type button config ─────────────────────────────────────────────────────────
const TYPE_BTNS = [
  { id: 'meal',         emoji: '🍽️', label: 'Meal',    cls: 'border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500' },
  { id: 'exercise',     emoji: '🏃', label: 'Exercise', cls: 'border-orange-200 dark:border-orange-700/50 text-orange-700 dark:text-orange-300 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-orange-500/20' },
  { id: 'sleep',        emoji: '🛌', label: 'Sleep',    cls: 'border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-purple-500/20' },
  { id: 'measurements', emoji: '📏', label: 'Measure',  cls: 'border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300 hover:border-green-400 dark:hover:border-green-500 hover:shadow-green-500/20' },
];

function formatDateLabel(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export default function ProDayModal({ date, dateStr, entries, onClose }) {
  const [mode, setMode]             = useState('add');   // 'add' | 'view'
  const [activeType, setActiveType] = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const addEntry          = useMutation(api.entries.add);
  const deleteEntry       = useMutation(api.entries.remove);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto         = useMutation(api.photos.save);
  const dayPhotos         = useQuery(api.photos.list, { date: dateStr }) ?? [];
  const { settings } = useConvexSettings();

  const isFormActive = !!activeType;

  const goToPhotoGallery = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('pro:navigate', { detail: 'photos' }));
  };

  const handleTypeSelect = (id) => {
    setActiveType(id);
    setPhotoFile(null);
  };

  const uploadPhoto = async () => {
    if (!photoFile) return undefined;
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': photoFile.type },
      body: photoFile,
    });
    if (!res.ok) return undefined;
    const { storageId } = await res.json();
    return await savePhoto({ storageId, date: dateStr });
  };

  const handleSave = async (dataOrArray) => {
    const photoId = await uploadPhoto();
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    for (const item of items) {
      await addEntry({ ...item, photoId });
    }
    setPhotoFile(null);
    setActiveType(null);
  };

  const handleSavePhotoOnly = async () => {
    if (!photoFile) return;
    setSavingPhoto(true);
    try {
      await uploadPhoto();
      setPhotoFile(null);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleDelete = (id) => deleteEntry({ id });

  const renderForm = () => {
    if (!activeType) return null;
    const props = { dateStr, onSave: handleSave, onCancel: () => setActiveType(null) };
    switch (activeType) {
      case 'meal':         return <MealForm         {...props} />;
      case 'exercise':     return <ExerciseLogForm  {...props} />;
      case 'sleep':        return <SleepForm        {...props} />;
      case 'measurements': return <MeasurementsForm {...props} weightUnit={settings?.weightUnit ?? 'kg'} />;
      default:             return null;
    }
  };

  const activeBtn = TYPE_BTNS.find(t => t.id === activeType);

  // ── View Entries screen ────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div
        className="fixed inset-0 z-50 w-full h-full bg-white dark:bg-[var(--color-bg-base)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        style={{ paddingTop: '80px', paddingBottom: '80px' }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setMode('add')}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{formatDateLabel(date)}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
              {dayPhotos.length > 0 && ` · ${dayPhotos.length} photo${dayPhotos.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-lg mx-auto px-4 py-4">
            {dayPhotos.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Photos ({dayPhotos.length})
                  </p>
                  <button
                    type="button"
                    onClick={goToPhotoGallery}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View in Gallery
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dayPhotos.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={goToPhotoGallery}
                      className="flex-shrink-0"
                      aria-label="Open Photo Gallery"
                    >
                      <img
                        src={p.url ?? ''}
                        alt={p.caption ?? 'Photo'}
                        className="w-20 h-20 rounded-xl object-cover border border-gray-100 dark:border-gray-800"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {entries.length === 0 && dayPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No entries yet</p>
                <button
                  onClick={() => setMode('add')}
                  className="mt-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add first entry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {entries.map(entry => (
                  <EntryCard key={entry._id} entry={entry} weightUnit={settings?.weightUnit ?? 'kg'} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer — add entry button */}
        {entries.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setMode('add')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Entry
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Add Entry screen (default) ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[var(--color-bg-base)] dark:via-[var(--color-bg-base)] dark:to-[var(--color-bg-base)] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div
        className={`flex-1 overflow-y-auto min-h-0 py-8 ${!isFormActive ? 'flex items-center justify-center' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center">

          {/* Date display */}
          {!isFormActive && (
            <div className="w-full max-w-[380px] md:max-w-4xl mx-auto mb-4 text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {formatDateLabel(date)}
              </div>
            </div>
          )}

          {/* Card */}
          <div className={`w-full ${
            isFormActive
              ? 'max-w-2xl mx-auto'
              : 'max-w-[380px] md:max-w-4xl mx-auto border border-gray-200/50 dark:border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl bg-white/95 dark:bg-[var(--color-bg-base)]/95 backdrop-blur-sm p-6 md:p-8 space-y-6 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50/50 before:via-transparent before:to-purple-50/50 dark:before:from-blue-900/10 dark:before:via-transparent dark:before:to-purple-900/10 before:pointer-events-none'
          }`}>

            {/* Card header */}
            {!isFormActive && (
              <>
              <div className="flex flex-col gap-4 mb-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        Add a New Entry
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        Quickly log meals, workouts, sleep, or measurements.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Close"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-50/90 dark:bg-slate-950/70 p-4">
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select Entry Type</div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Choose what you'd like to track and log it in seconds.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {TYPE_BTNS.map(t => {
                      const isActiveBtn = activeType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTypeSelect(t.id)}
                          className={`group relative py-4 md:py-5 rounded-[1.75rem] text-sm md:text-base overflow-hidden transition-all duration-300 flex flex-col items-center justify-center min-h-[4rem] w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isActiveBtn ? 'border-2 border-blue-500 bg-white shadow-[0_20px_45px_-30px_rgba(59,130,246,0.8)]' : 'border-2 border-transparent bg-white dark:bg-gray-900/90 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5'}`}
                        >
                          <div className={`relative z-10 flex flex-col items-center gap-3 ${isActiveBtn ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            <div className={`w-12 h-12 rounded-3xl flex items-center justify-center ${isActiveBtn ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
                              <span className="text-2xl md:text-3xl">{t.emoji}</span>
                            </div>
                            <span>{t.label}</span>
                          </div>
                          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Photo attach — below type buttons, always visible */}
              <PhotoAttach file={photoFile} setFile={setPhotoFile} />
              <button
                type="button"
                onClick={handleSavePhotoOnly}
                disabled={!photoFile || savingPhoto}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {savingPhoto ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : 'Save Photo'}
              </button>
              </>
            )}

            {/* Active form */}
            {isFormActive && (
              <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeBtn?.emoji}</span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {activeBtn?.label} Details
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveType(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {renderForm()}
              </div>
            )}

          </div>

          {/* View Entries button — shown below card when not in a form */}
          {!isFormActive && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setMode('view')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View All Entries ({entries.length})
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
