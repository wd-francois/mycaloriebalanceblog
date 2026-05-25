import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import Calendar from '../Calendar';
import ProDayModal from './ProDayModal';

// Isolated so a query failure can't crash the home screen
function PendingInviteCard() {
  const invites     = useQuery(api.coaches.getPendingInvites) ?? [];
  const acceptInvite  = useMutation(api.coaches.acceptInvite);
  const declineInvite = useMutation(api.coaches.declineInvite);
  const [busy, setBusy] = useState(null); // inviteId being acted on

  if (invites.length === 0) return null;

  const handle = async (inviteId, action) => {
    setBusy(inviteId);
    try {
      if (action === 'accept') await acceptInvite({ inviteId });
      else await declineInvite({ inviteId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border-2 border-blue-200 dark:border-blue-800 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
          Coach Request{invites.length > 1 ? 's' : ''}
        </h3>
      </div>
      <div className="flex flex-col gap-3">
        {invites.map(invite => {
          const displayName = invite.name || invite.email || 'Unknown coach';
          const initial = displayName[0].toUpperCase();
          return (
            <div key={invite.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">wants to be your coach</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handle(invite.id, 'decline')}
                  disabled={busy === invite.id}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => handle(invite.id, 'accept')}
                  disabled={busy === invite.id}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {busy === invite.id ? '…' : 'Accept'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Isolated so a query failure can't crash the home screen
function CoachFeedbackCard() {
  const self           = useQuery(api.users.viewer);
  const comments       = useQuery(
    api.comments.listForClient,
    self?._id ? { targetUserId: self._id } : 'skip'
  ) ?? [];
  const notifCounts    = useQuery(api.notifications.getUnreadCounts) ?? { byType: { comments: 0 } };
  const markReadByType = useMutation(api.notifications.markReadByType);

  const hasNew = notifCounts.byType.comments > 0;

  useEffect(() => {
    if (hasNew) markReadByType({ type: 'comment' });
  }, [hasNew]);

  if (comments.length === 0) return null;
  const recent = [...comments].sort((a, b) => b._creationTime - a._creationTime).slice(0, 5);
  return (
    <div className="bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Coach Feedback</h3>
        {hasNew && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">New</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {recent.map(c => (
          <div key={c._id} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1">{c.date}</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

const CARD      = 'bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4';
const CARD_TITLE = 'text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3';
const METRIC_VAL = 'text-xl sm:text-2xl font-bold';
const METRIC_LBL = 'text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1';

export default function ProHome({ onNavigate, role }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewedMonth, setViewedMonth]   = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const [showDayModal, setShowDayModal] = useState(false);

  const todayDateStr    = todayStr();
  const selectedDateStr = dateToStr(selectedDate);
  const { start, end }  = getMonthRange(viewedMonth.year, viewedMonth.month);

  const monthEntries = useQuery(api.entries.listByDateRange, { startDate: start, endDate: end }) ?? [];
  const todayEntries = useQuery(api.entries.list, { date: todayDateStr }) ?? [];
  const settings     = useQuery(api.userSettings.get) ?? null;

  const calendarEntries = useMemo(() => {
    const map = {};
    for (const entry of monthEntries) {
      const [y, m, d] = entry.date.split('-').map(Number);
      const key = new Date(y, m - 1, d).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return map;
  }, [monthEntries]);

  const selectedDateEntries = useMemo(
    () => monthEntries.filter(e => e.date === selectedDateStr),
    [monthEntries, selectedDateStr]
  );

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setViewedMonth({ year: date.getFullYear(), month: date.getMonth() });
    setShowDayModal(true);
  };

  const todayCalories = todayEntries
    .filter(e => e.type === 'meal')
    .reduce((sum, e) => sum + (e.calories ?? 0), 0);
  const calorieGoal = settings?.calorieGoal ?? null;

  const sleepEntry = todayEntries.find(e => e.type === 'sleep');
  const todaySleepDuration = sleepEntry?.sleepDuration
    ? `${sleepEntry.sleepDuration.toFixed(1)}h`
    : null;

  if (role === 'coach') {
    return (
      <div className="w-full">
        <div className="max-w-sm mx-auto flex flex-col gap-4 sm:gap-6 px-3 sm:px-4 w-full py-4 sm:py-6">
          <div className={CARD}>
            <h3 className={CARD_TITLE}>Coach Dashboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              View and manage your clients from the Clients tab.
            </p>
            <button
              onClick={() => onNavigate('clients')}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto flex flex-col gap-4 sm:gap-6 px-3 sm:px-4 w-full py-4 sm:py-6">

        <PendingInviteCard />

        {/* Calorie Goal Card */}
        <div className={CARD}>
          <h3 className={CARD_TITLE}>Calorie Goal</h3>
          {calorieGoal ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className={`text-center p-2 sm:p-3 rounded-xl ${todayCalories > calorieGoal ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                <div className={`${METRIC_VAL} ${todayCalories > calorieGoal ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {todayCalories}
                </div>
                <div className={METRIC_LBL}>Today</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className={`${METRIC_VAL} text-purple-600 dark:text-purple-400`}>{calorieGoal}</div>
                <div className={METRIC_LBL}>Goal</div>
              </div>
              <div className={`text-center p-2 sm:p-3 rounded-xl ${todayCalories > calorieGoal ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <div className={`${METRIC_VAL} ${todayCalories > calorieGoal ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {Math.abs(todayCalories - calorieGoal)}
                </div>
                <div className={METRIC_LBL}>{todayCalories > calorieGoal ? 'Over' : 'Under'}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set your goal in{' '}
                <button onClick={() => onNavigate('settings')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Settings
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Calendar */}
        <Calendar
          selectedDate={selectedDate}
          entries={calendarEntries}
          onSelectDate={handleDateSelect}
          onMonthChange={(year, month) => setViewedMonth({ year, month })}
        />

        {/* Today's Summary Card */}
        <div className={CARD}>
          <h3 className={CARD_TITLE}>Today's Summary</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className={`${METRIC_VAL} text-blue-600 dark:text-blue-400`}>
                {todayEntries.filter(e => e.type === 'meal').length}
              </div>
              <div className={METRIC_LBL}>Meals</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className={`${METRIC_VAL} text-purple-600 dark:text-purple-400`}>
                {todaySleepDuration ?? '—'}
              </div>
              <div className={METRIC_LBL}>Sleep</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className={`${METRIC_VAL} text-green-600 dark:text-green-400`}>
                {todayEntries.filter(e => e.type === 'measurements').length}
              </div>
              <div className={METRIC_LBL}>Measured</div>
            </div>
          </div>
        </div>

        <CoachFeedbackCard />

      </div>

      {/* Day detail modal */}
      {showDayModal && (
        <ProDayModal
          date={selectedDate}
          dateStr={selectedDateStr}
          entries={selectedDateEntries}
          onClose={() => setShowDayModal(false)}
        />
      )}
    </div>
  );
}
