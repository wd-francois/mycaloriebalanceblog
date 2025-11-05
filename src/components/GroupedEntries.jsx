import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';

const GroupedEntries = ({ entries, formatTime, onEdit, onDelete, onInfoClick, onDragStart, onDragEnd, onDragOver, onDrop, settings = { weightUnit: 'lbs', lengthUnit: 'in' } }) => {
  const [collapsedTimes, setCollapsedTimes] = useState(new Set());
  
  // Get settings context - must be called unconditionally at top level
  // Since this component is used within SettingsProvider, the context should always be available
  const settingsContext = useSettings();
  
  // Fallback functions if context methods are not available
  const defaultGenerateAIPrompt = (mealData) => {
    const { name, amount, calories, protein, carbs, fats } = mealData;
    return `I have a meal entry for "${name || 'Unknown Meal'}" with amount: ${amount || 'not specified'}. 

Current nutritional values:
- Calories: ${calories || 'not specified'}
- Protein: ${protein || 'not specified'}g
- Carbs: ${carbs || 'not specified'}g
- Fats: ${fats || 'not specified'}g

Please provide accurate nutritional information for this meal. Include:
1. Calories per serving
2. Protein content in grams
3. Carbohydrates content in grams
4. Fats content in grams
5. Any additional nutritional insights

Please format your response clearly so I can easily update my meal entry.`;
  };

  const defaultGetAIServiceUrl = (prompt) => {
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://chat.openai.com/?q=${encodedPrompt}`;
  };

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


  // Separate sleep entries from other entries (measurements now included in time grouping)
  const sleepEntries = entries.filter(entry => entry.type === 'sleep');
  const otherEntries = entries.filter(entry => entry.type !== 'sleep');

  // Group other entries by time
  const groupedEntries = otherEntries.reduce((groups, entry) => {
    const timeKey = formatTime(entry.time);
    if (!groups[timeKey]) {
      groups[timeKey] = [];
    }
    groups[timeKey].push(entry);
    return groups;
  }, {});

  // Sort groups by time
  const sortedGroups = Object.keys(groupedEntries).sort((a, b) => {
    const timeA = groupedEntries[a][0].time;
    const timeB = groupedEntries[b][0].time;
    
    // Convert to 24-hour format for comparison
    const hourA = timeA.period === 'AM' ? (timeA.hour === 12 ? 0 : timeA.hour) : (timeA.hour === 12 ? 12 : timeA.hour + 12);
    const hourB = timeB.period === 'AM' ? (timeB.hour === 12 ? 0 : timeB.hour) : (timeB.hour === 12 ? 12 : timeB.hour + 12);
    
    if (hourA !== hourB) return hourA - hourB;
    return timeA.minute - timeB.minute;
  });

  const toggleTimeGroup = (timeKey) => {
    setCollapsedTimes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timeKey)) {
        newSet.delete(timeKey);
      } else {
        newSet.add(timeKey);
      }
      return newSet;
    });
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

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Sleep entries always on top */}
      {sleepEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-base sm:text-lg">😴</span>
                <h3 className="font-semibold text-purple-800 text-sm sm:text-base">Sleep</h3>
                {sleepEntries[0]?.bedtime && sleepEntries[0]?.waketime && (
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-purple-600 min-w-0">
                    <span className="truncate">{sleepEntries[0].bedtime.hour}:{sleepEntries[0].bedtime.minute.toString().padStart(2, '0')} {sleepEntries[0].bedtime.period}</span>
                    <span className="hidden sm:inline">→</span>
                    <span className="sm:hidden">-</span>
                    <span className="truncate">{sleepEntries[0].waketime.hour}:{sleepEntries[0].waketime.minute.toString().padStart(2, '0')} {sleepEntries[0].waketime.period}</span>
                    {sleepEntries[0]?.duration && (
                      <span className="font-medium hidden sm:inline">({sleepEntries[0].duration.replace('h', ' hours')})</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => onInfoClick(sleepEntries[0])}
                  className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation"
                  title="Add notes"
                >
                  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(sleepEntries[0])}
                  className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation"
                  title="Edit entry"
                >
                  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(sleepEntries[0].id)}
                  className="p-2 sm:p-2 text-gray-400 hover:text-red-600 transition-colors touch-manipulation"
                  title="Delete entry"
                >
                  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Measurements entries - expanded display */}

      {/* Other entries grouped by time */}
      {sortedGroups.map((timeKey) => {
        const group = groupedEntries[timeKey];
        const isCollapsed = collapsedTimes.has(timeKey);
        const entryCount = group.length;
        
        return (
          <div key={timeKey} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Time Group Header */}
            <div 
              className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 cursor-pointer hover:bg-gray-100 transition-colors touch-manipulation"
              onClick={() => toggleTimeGroup(timeKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-800 text-xs sm:text-sm font-medium rounded-full flex items-center justify-center">
                    {timeKey}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">
                    {entryCount} entr{entryCount === 1 ? 'y' : 'ies'}
                  </span>
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
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 ${typeInfo.bgColor} ${typeInfo.textColor} text-xs font-medium rounded-full flex items-center justify-center`}>
                            {typeInfo.emoji} {typeInfo.label}
                          </div>
                          <div className="font-medium text-gray-900 text-lg">
                            {entry.name}
                          </div>
                        </div>
                        
                        {/* Additional info based on entry type */}
                        {entry.type === 'meal' && (entry.amount || entry.calories || entry.protein || entry.carbs || entry.fats) && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            {entry.amount && (
                              <div>Amount: {entry.amount}</div>
                            )}
                            
                            
                            {(entry.calories || entry.protein || entry.carbs || entry.fats) && (
                              <div className="flex flex-wrap gap-3 text-xs">
                                {entry.calories && <span>🔥 {entry.calories} cal</span>}
                                {entry.protein && <span>🥩 {entry.protein}g protein</span>}
                                {entry.carbs && <span>🍞 {entry.carbs}g carbs</span>}
                                {entry.fats && <span>🥑 {entry.fats}g fats</span>}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {entry.type === 'exercise' && entry.sets && entry.sets.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <div className="mb-2">
                              <span className="font-medium">{entry.sets.length} set{entry.sets.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-1">
                              {entry.sets.map((set, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded">
                                  <span className="font-medium">Set {index + 1}:</span>
                                  <span>{set.reps || 0} reps</span>
                                  {set.load && <span>• {set.load}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {entry.type === 'sleep' && entry.duration && (
                          <div className="mt-2 text-sm text-gray-600">
                            Duration: {entry.duration}
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

