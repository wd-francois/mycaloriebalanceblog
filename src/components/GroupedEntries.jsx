import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';
import { defaultGenerateAIPrompt, defaultGetAIServiceUrl } from '../lib/utils';

const GroupedEntries = ({ entries, formatTime, onEdit, onDelete, onInfoClick, onDragStart, onDragEnd, onDragOver, onDrop, settings = { weightUnit: 'lbs', lengthUnit: 'in' } }) => {
  const [collapsedTimes, setCollapsedTimes] = useState(new Set());

  // Reset collapsed times when entries change (e.g., when navigating back from another page)
  useEffect(() => {
    setCollapsedTimes(new Set());
  }, [entries]);

  // Get settings context - must be called unconditionally at top level
  // Since this component is used within SettingsProvider, the context should always be available
  const settingsContext = useSettings();

  // Use shared utility functions for AI prompts

  const generateAIPrompt = settingsContext?.generateAIPrompt || defaultGenerateAIPrompt;
  const getAIServiceUrl = settingsContext?.getAIServiceUrl || defaultGetAIServiceUrl;

  const handleAIClick = (entry) => {
    // Generate prompt using settings context
    const prompt = generateAIPrompt({
      name: entry.name,
      amount: entry.amount,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fats: entry.fats
    });

    // Get the appropriate AI service URL
    const aiUrl = getAIServiceUrl(prompt);

    // Open AI service with the prompt
    window.open(aiUrl, '_blank');
  };


  // Group entries by category: Meals, Exercise, Measurements, Sleep
  const getCategory = (entry) => {
    if (entry.type === 'meal') return 'meal';
    if (entry.type === 'exercise' || entry.type === 'activity' || !entry.type) return 'exercise';
    if (entry.type === 'measurements') return 'measurements';
    if (entry.type === 'sleep') return 'sleep';
    return 'exercise';
  };

  const categoryOrder = ['meal', 'exercise', 'measurements', 'sleep'];
  const categoryLabels = ['Meals', 'Exercise', 'Measurements', 'Sleep'];

  const groupedByCategory = entries.reduce((acc, entry) => {
    const cat = getCategory(entry);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  // Sort entries within each category by time (sleep uses bedtime)
  const sortByTime = (a, b) => {
    const timeA = a.type === 'sleep' ? a.bedtime : a.time;
    const timeB = b.type === 'sleep' ? b.bedtime : b.time;
    if (!timeA || !timeB) return 0;
    const hourA = timeA.period === 'AM' ? (timeA.hour === 12 ? 0 : timeA.hour) : (timeA.hour === 12 ? 12 : timeA.hour + 12);
    const hourB = timeB.period === 'AM' ? (timeB.hour === 12 ? 0 : timeB.hour) : (timeB.hour === 12 ? 12 : timeB.hour + 12);
    if (hourA !== hourB) return hourA - hourB;
    return (timeA.minute || 0) - (timeB.minute || 0);
  };

  categoryOrder.forEach((cat) => {
    if (groupedByCategory[cat]) {
      groupedByCategory[cat].sort(sortByTime);
    }
  });

  const toggleCategory = (catKey) => {
    setCollapsedTimes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catKey)) {
        newSet.delete(catKey);
      } else {
        newSet.add(catKey);
      }
      return newSet;
    });
  };

  const getGroupTimeRange = (group, formatTimeFn) => {
    if (!formatTimeFn || !group || group.length === 0) return null;
    const withTime = group
      .map((e) => ({ t: e.type === 'sleep' ? e.bedtime : e.time }))
      .filter((x) => x.t && typeof x.t === 'object' && x.t.hour != null)
      .map((x) => x.t);
    if (withTime.length === 0) return null;
    withTime.sort((a, b) => {
      const hourA = a.period === 'AM' ? (a.hour === 12 ? 0 : a.hour) : (a.hour === 12 ? 12 : a.hour + 12);
      const hourB = b.period === 'AM' ? (b.hour === 12 ? 0 : b.hour) : (b.hour === 12 ? 12 : b.hour + 12);
      if (hourA !== hourB) return hourA - hourB;
      return (a.minute || 0) - (b.minute || 0);
    });
    const first = withTime[0];
    return formatTimeFn(first);
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'meal':
        return {
          emoji: '🍽️',
          color: 'blue',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          label: 'Meal'
        };
      case 'exercise':
      case 'activity':
        return {
          emoji: '💪',
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Exercise'
        };
      case 'sleep':
        return {
          emoji: '😴',
          color: 'purple',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          label: 'Sleep'
        };
      case 'measurements':
        return {
          emoji: '📏',
          color: 'orange',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          label: 'Measurements'
        };
      default:
        return {
          emoji: '📝',
          color: 'gray',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          label: 'Entry'
        };
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No entries logged yet</h3>
        <p className="mt-1 text-sm text-gray-500">Add your first entry</p>
      </div>
    );
  }

  const categoryStyles = {
    meal: { bg: 'bg-blue-50', text: 'text-blue-800', emoji: '🍽️' },
    exercise: { bg: 'bg-green-50', text: 'text-green-800', emoji: '💪' },
    measurements: { bg: 'bg-orange-50', text: 'text-orange-800', emoji: '📏' },
    sleep: { bg: 'bg-purple-50', text: 'text-purple-800', emoji: '😴' },
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {categoryOrder.map((catKey) => {
        const group = groupedByCategory[catKey];
        if (!group || group.length === 0) return null;

        const label = categoryLabels[categoryOrder.indexOf(catKey)];
        const entryCount = group.length;
        const style = categoryStyles[catKey] || categoryStyles.exercise;
        const isCollapsed = collapsedTimes.has(catKey);
        const timeRange = getGroupTimeRange(group, formatTime);

        return (
          <div key={catKey} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Category Header */}
            <div
              className={`${style.bg} dark:bg-opacity-20 px-3 sm:px-4 py-2 sm:py-3 cursor-pointer hover:opacity-90 transition-colors touch-manipulation`}
              onClick={() => toggleCategory(catKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <h3 className={`font-semibold ${style.text} text-sm sm:text-base flex items-center gap-2 flex-wrap`}>
                    {timeRange && (
                      <span className="font-normal opacity-90">
                        {timeRange}
                      </span>
                    )}
                    <span>
                      {style.emoji}{label}
                    </span>
                    <span>
                      - {entryCount} entr{entryCount === 1 ? 'y' : 'ies'}
                    </span>
                  </h3>
                </div>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Entries List */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-200">
                {group.map((entry) => {
                  const typeInfo = getTypeInfo(entry.type);

                  return (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, entry)}
                      onDragEnd={onDragEnd}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, entry)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-white hover:bg-gray-50 transition-colors cursor-move hover:border-blue-300 touch-manipulation"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="font-medium text-gray-900 dark:text-white text-lg">
                            {entry.name}
                          </div>
                        </div>

                        {/* Additional info based on entry type */}
                        {entry.type === 'meal' && (entry.amount || entry.calories || entry.protein || entry.carbs || entry.fats || entry.fibre || entry.other) && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            {entry.amount && (
                              <div>Amount: {entry.amount}</div>
                            )}


                            {(entry.calories || entry.protein || entry.carbs || entry.fats || entry.fibre || entry.other) && (
                              <div className="flex flex-wrap gap-3 text-xs">
                                {entry.calories && <span>🔥 {entry.calories} cal</span>}
                                {entry.protein && <span>🥩 {entry.protein}g protein</span>}
                                {entry.carbs && <span>🍞 {entry.carbs}g carbs</span>}
                                {entry.fats && <span>🥑 {entry.fats}g fats</span>}
                                {entry.fibre && <span>🌾 {entry.fibre}g fibre</span>}
                                {entry.other && <span>📝 {entry.other}</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {(entry.type === 'exercise' || entry.type === 'activity') && entry.sets && entry.sets.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="mb-2">
                              <span className="font-medium">Sets · Reps · Load/Time</span>
                              {entry.durationMinutes != null && entry.durationMinutes !== '' && (
                                <span className="ml-2">· {entry.durationMinutes} min</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {entry.sets.map((set, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded">
                                  <span className="font-medium">Set {index + 1}:</span>
                                  <span>{set.reps || '—'} reps</span>
                                  {(set.load !== '' && set.load != null) && <span>· {set.load}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.type === 'sleep' && (
                          <div className="mt-2 text-sm text-gray-600">
                            {entry.bedtime && entry.waketime && (
                              <span>
                                {entry.bedtime.hour}:{String(entry.bedtime.minute).padStart(2, '0')} {entry.bedtime.period} → {entry.waketime.hour}:{String(entry.waketime.minute).padStart(2, '0')} {entry.waketime.period}
                                {entry.duration && <span className="ml-1">({entry.duration})</span>}
                              </span>
                            )}
                            {(!entry.bedtime || !entry.waketime) && entry.duration && (
                              <span>Duration: {entry.duration}</span>
                            )}
                          </div>
                        )}

                        {entry.type === 'measurements' && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            {entry.weight && (
                              <div className="font-medium">Weight: {entry.weight} {settings.weightUnit}</div>
                            )}

                            {(entry.neck || entry.shoulders || entry.chest || entry.waist || entry.hips || entry.thigh || entry.arm) && (
                              <div className="flex flex-wrap gap-3 text-xs">
                                {entry.neck && <span>Neck: {entry.neck}{settings.lengthUnit}</span>}
                                {entry.shoulders && <span>Shoulders: {entry.shoulders}{settings.lengthUnit}</span>}
                                {entry.chest && <span>Chest: {entry.chest}{settings.lengthUnit}</span>}
                                {entry.waist && <span>Waist: {entry.waist}{settings.lengthUnit}</span>}
                                {entry.hips && <span>Hips: {entry.hips}{settings.lengthUnit}</span>}
                                {entry.thigh && <span>Thigh: {entry.thigh}{settings.lengthUnit}</span>}
                                {entry.arm && <span>Arm: {entry.arm}{settings.lengthUnit}</span>}
                              </div>
                            )}

                            {(entry.chestSkinfold || entry.abdominalSkinfold || entry.thighSkinfold || entry.tricepSkinfold || entry.subscapularSkinfold || entry.suprailiacSkinfold) && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-500 mb-1">Skinfolds:</div>
                                <div className="flex flex-wrap gap-3 text-xs">
                                  {entry.chestSkinfold && <span>Chest: {entry.chestSkinfold}mm</span>}
                                  {entry.abdominalSkinfold && <span>Abdominal: {entry.abdominalSkinfold}mm</span>}
                                  {entry.thighSkinfold && <span>Thigh: {entry.thighSkinfold}mm</span>}
                                  {entry.tricepSkinfold && <span>Tricep: {entry.tricepSkinfold}mm</span>}
                                  {entry.subscapularSkinfold && <span>Subscapular: {entry.subscapularSkinfold}mm</span>}
                                  {entry.suprailiacSkinfold && <span>Suprailiac: {entry.suprailiacSkinfold}mm</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Information */}
                        {entry.notes && (
                          <div className="mt-2 text-sm text-gray-500">
                            <div className="mb-1">
                              <span className="font-medium">Notes:</span> {entry.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => onInfoClick(entry)}
                          className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation"
                          title="Add notes"
                        >
                          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {entry.type === 'meal' && (
                          <button
                            onClick={() => handleAIClick(entry)}
                            className="p-2 sm:p-2 text-gray-400 hover:text-purple-600 transition-colors touch-manipulation"
                            title="Get AI nutrition info"
                          >
                            <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(entry)}
                          className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation"
                          title="Edit entry"
                        >
                          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          className="p-2 sm:p-2 text-gray-400 hover:text-red-600 transition-colors touch-manipulation"
                          title="Delete entry"
                        >
                          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedEntries;

