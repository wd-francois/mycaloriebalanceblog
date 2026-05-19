import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { CoachThread } from './ProMessages';

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getRange(days) {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: dateToStr(start), endDate: dateToStr(end) };
}

const RANGES = [
  { label: '7d',   days: 7  },
  { label: '30d',  days: 30 },
  { label: '90d',  days: 90 },
  { label: 'All',  days: null },
];

// ── Comment sub-components ───────────────────────────────────────────────────

function CommentRow({ comment, onDelete }) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
        {comment.authorInitial ?? 'C'}
      </div>
      <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{comment.text}</p>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-all flex-shrink-0 px-1"
      >
        ×
      </button>
    </div>
  );
}

function CommentInput({ onSubmit }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (err) {
      setError(err.message ?? 'Failed to post comment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); setError(''); }}
          placeholder="Add a comment…"
          className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || saving}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {saving ? '…' : 'Post'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 px-0.5">{error}</p>}
    </form>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

const TYPE_LABEL = { meal: 'Meal', exercise: 'Exercise', activity: 'Activity', sleep: 'Sleep', measurements: 'Measurements' };
const TYPE_COLOR = {
  meal:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  exercise:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  activity:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  sleep:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  measurements: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function EntryMeta({ entry }) {
  const items = [];

  if (entry.type === 'meal') {
    if (entry.calories != null) items.push(`${entry.calories} kcal`);
    if (entry.protein  != null) items.push(`${entry.protein}g protein`);
    if (entry.carbs    != null) items.push(`${entry.carbs}g carbs`);
    if (entry.fat      != null) items.push(`${entry.fat}g fat`);
  } else if (entry.type === 'sleep') {
    if (entry.sleepDuration != null) items.push(`${entry.sleepDuration.toFixed(1)}h`);
    if (entry.sleepQuality)          items.push(entry.sleepQuality);
    if (entry.bedtime)               items.push(`Bed ${entry.bedtime.hour}:${String(entry.bedtime.minute).padStart(2,'0')} ${entry.bedtime.period}`);
    if (entry.waketime)              items.push(`Wake ${entry.waketime.hour}:${String(entry.waketime.minute).padStart(2,'0')} ${entry.waketime.period}`);
  } else if (entry.type === 'measurements') {
    if (entry.weight != null) items.push(`${entry.weight} ${entry.weightUnit ?? 'kg'}`);
    if (entry.waist  != null) items.push(`Waist ${entry.waist}cm`);
    if (entry.chest  != null) items.push(`Chest ${entry.chest}cm`);
    if (entry.hips   != null) items.push(`Hips ${entry.hips}cm`);
  } else if (entry.type === 'exercise') {
    if (entry.exercisesData) {
      try {
        const parsed = JSON.parse(entry.exercisesData);
        const exs = Array.isArray(parsed) ? parsed : parsed?.exercises ?? [];
        exs.slice(0, 3).forEach(ex => {
          if (ex.name) items.push(ex.name + (ex.sets ? ` ×${ex.sets}` : ''));
        });
        if (exs.length > 3) items.push(`+${exs.length - 3} more`);
      } catch {}
    }
  } else if (entry.type === 'activity') {
    if (entry.durationMinutes) items.push(`${entry.durationMinutes} min`);
    if (entry.distance)        items.push(entry.distance);
    if (entry.steps)           items.push(`${entry.steps} steps`);
  }

  if (entry.notes) items.push(`"${entry.notes}"`);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
      {items.map((item, i) => (
        <span key={i} className="text-xs text-gray-500 dark:text-gray-400">{item}</span>
      ))}
    </div>
  );
}

function EntryCard({ entry, comments, onAddComment, onDeleteComment }) {
  const [open, setOpen] = useState(false);
  const entryComments = comments.filter(c => c.entryId === entry._id);

  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${TYPE_COLOR[entry.type] ?? 'bg-gray-100 text-gray-700'}`}>
          {TYPE_LABEL[entry.type] ?? entry.type}
        </span>
        <div className="flex-1 min-w-0">
          {entry.name && <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{entry.name}</p>}
          <EntryMeta entry={entry} />
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 text-xs font-semibold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          {open ? 'Cancel' : '+ Comment'}
        </button>
      </div>

      {entryComments.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex flex-col gap-1.5">
          {entryComments.map(c => (
            <CommentRow key={c._id} comment={c} onDelete={() => onDeleteComment(c._id)} />
          ))}
        </div>
      )}

      {open && (
        <CommentInput onSubmit={async text => {
          await onAddComment({ entryId: entry._id, text, date: entry.date });
          setOpen(false);
        }} />
      )}
    </div>
  );
}

// ── Photo card ────────────────────────────────────────────────────────────────

function PhotoCard({ photo, comments, onAddComment, onDeleteComment }) {
  const [open, setOpen] = useState(false);
  const photoComments = comments.filter(c => c.photoId === photo._id);

  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="relative">
        <img src={photo.url} alt={photo.caption ?? 'Photo'} className="w-full aspect-square object-cover" />
        <button
          onClick={() => setOpen(v => !v)}
          className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-semibold text-blue-600 px-2 py-1 rounded-lg shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-colors"
        >
          {open ? 'Cancel' : '+ Comment'}
        </button>
      </div>
      {photo.caption && <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">{photo.caption}</p>}

      {photoComments.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex flex-col gap-1.5">
          {photoComments.map(c => (
            <CommentRow key={c._id} comment={c} onDelete={() => onDeleteComment(c._id)} />
          ))}
        </div>
      )}

      {open && (
        <CommentInput onSubmit={async text => {
          await onAddComment({ photoId: photo._id, text, date: photo.date });
          setOpen(false);
        }} />
      )}
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ entries, photos, comments }) {
  const stats = useMemo(() => {
    if (!entries) return null;

    const now     = new Date();
    const last7   = new Set(Array.from({ length: 7  }, (_, i) => { const d = new Date(now); d.setDate(d.getDate()-i); return dateToStr(d); }));
    const last30  = new Set(Array.from({ length: 30 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate()-i); return dateToStr(d); }));

    const dailyCal = {};
    const dailySleep = {};
    let exerciseSessions7 = 0;

    entries.forEach(e => {
      if (e.type === 'meal'    && e.calories)      dailyCal[e.date]   = (dailyCal[e.date] || 0) + e.calories;
      if (e.type === 'sleep'   && e.sleepDuration) dailySleep[e.date] = e.sleepDuration;
      if (e.type === 'exercise' && last7.has(e.date)) exerciseSessions7++;
    });

    const calDays7 = [...last7].filter(d => dailyCal[d]);
    const avgCal7  = calDays7.length ? Math.round(calDays7.reduce((s,d)=>s+dailyCal[d],0)/calDays7.length) : null;

    const sleepDays7  = [...last7].filter(d => dailySleep[d]);
    const avgSleep7   = sleepDays7.length ? sleepDays7.reduce((s,d)=>s+dailySleep[d],0)/sleepDays7.length : null;

    const measurements = entries.filter(e => e.type === 'measurements' && e.weight).sort((a,b)=>b.date.localeCompare(a.date));
    const latestWeight = measurements[0];

    const allDates    = [...new Set(entries.map(e => e.date))].sort();
    const totalDays   = allDates.length;
    const last30Days  = allDates.filter(d => last30.has(d)).length;
    const lastActive  = allDates[allDates.length - 1] ?? null;

    // Streak
    let streak = 0;
    const dateSet = new Set(allDates);
    const d = new Date();
    if (!dateSet.has(dateToStr(d))) d.setDate(d.getDate()-1);
    while (dateSet.has(dateToStr(d))) { streak++; d.setDate(d.getDate()-1); }

    return { avgCal7, calDays7Len: calDays7.length, avgSleep7, sleepDays7Len: sleepDays7.length, exerciseSessions7, latestWeight, totalDays, last30Days, lastActive, streak };
  }, [entries]);

  if (!stats) return <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</div>;

  const totalComments = comments?.length ?? 0;
  const totalPhotos   = photos?.length   ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Avg calories',   value: stats.avgCal7  != null ? stats.avgCal7        : '—', sub: stats.avgCal7  != null ? `${stats.calDays7Len}d this week` : 'No meals this week', color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Avg sleep',      value: stats.avgSleep7 != null ? `${stats.avgSleep7.toFixed(1)}h` : '—', sub: stats.avgSleep7 != null ? `${stats.sleepDays7Len}d this week` : 'No sleep this week', color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Exercise',       value: stats.exerciseSessions7,  sub: 'sessions this week', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Latest weight',  value: stats.latestWeight ? `${stats.latestWeight.weight}${stats.latestWeight.weightUnit ?? 'kg'}` : '—', sub: stats.latestWeight ? stats.latestWeight.date : 'No measurements', color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-extrabold leading-tight ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Activity summary */}
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Activity</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Streak',      value: `${stats.streak}d` },
            { label: 'Days (30d)',  value: stats.last30Days },
            { label: 'Total days',  value: stats.totalDays },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-gray-50 dark:bg-gray-900/30 rounded-xl py-2">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Coach notes</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center bg-gray-50 dark:bg-gray-900/30 rounded-xl py-2">
            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{totalComments}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Comments</p>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-900/30 rounded-xl py-2">
            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{totalPhotos}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Photos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['overview', 'entries', 'photos'];

export default function ProClientDetail({ client, onBack }) {
  const [activeTab,    setActiveTab]    = useState('overview');
  const [rangeIdx,     setRangeIdx]     = useState(1); // default 30d
  const [showMessages, setShowMessages] = useState(false);

  const viewer      = useQuery(api.users.viewer);
  const addComment  = useMutation(api.comments.add);
  const delComment  = useMutation(api.comments.remove);

  const range = RANGES[rangeIdx];
  const rangeArgs = range.days ? getRange(range.days) : {};

  const entries  = useQuery(api.coaches.getClientEntries, { clientId: client.id, ...rangeArgs });
  const photos   = useQuery(api.coaches.getClientPhotos,  { clientId: client.id });
  const comments = useQuery(api.comments.listForClient,   { targetUserId: client.id });

  const coachInitial = viewer?.name
    ? viewer.name[0].toUpperCase()
    : viewer?.email
      ? viewer.email[0].toUpperCase()
      : 'C';

  // Attach coach initial to comments for display
  const enrichedComments = useMemo(() =>
    (comments ?? []).map(c => ({ ...c, authorInitial: coachInitial })),
    [comments, coachInitial]
  );

  const handleAddComment = (args) =>
    addComment({ targetUserId: client.id, ...args });

  const handleDeleteComment = (id) => delComment({ id });

  const initial     = (client.name || client.email || '?')[0].toUpperCase();
  const displayName = client.name || client.email || 'Unknown client';

  // Group entries by date for the entries tab
  const entriesByDate = useMemo(() => {
    if (!entries) return {};
    const map = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  const isLoading = entries === undefined || photos === undefined || comments === undefined;

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={showMessages ? () => setShowMessages(false) : onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
            {client.name && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{client.email}</p>}
          </div>
          <button
            onClick={() => setShowMessages(v => !v)}
            title="Messages"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${showMessages ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </button>
        </div>

        {/* Tabs + date filter — hidden when messages pane is open */}
        {!showMessages && (
          <>
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                    activeTab === t
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTab === 'entries' && (
              <div className="flex gap-1.5">
                {RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setRangeIdx(i)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      rangeIdx === i
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Content */}
        {showMessages ? (
          <CoachThread
            otherUserId={client.id}
            otherName={displayName}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewTab entries={entries} photos={photos} comments={enrichedComments} />
        ) : activeTab === 'entries' ? (
          sortedDates.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">No entries in this period</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                    {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex flex-col gap-2">
                    {entriesByDate[date].map(entry => (
                      <EntryCard
                        key={entry._id}
                        entry={entry}
                        comments={enrichedComments}
                        onAddComment={handleAddComment}
                        onDeleteComment={handleDeleteComment}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          photos.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">No photos yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map(photo => (
                <PhotoCard
                  key={photo._id}
                  photo={photo}
                  comments={enrichedComments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                />
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
