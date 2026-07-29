import TimePicker from '../TimePicker';
import ExerciseForm from '../ExerciseForm.jsx';

// ── Exercise Section — inline within the Add/Edit modal (add or edit exercise) ─
// Delegates the actual set-by-set builder to ExerciseForm.jsx; this just wires
// up the surrounding date/time display and maps formState <-> ExerciseForm's props.
export default function ExerciseSection({
  selectedDate,
  time,
  setTime,
  formState,
  exerciseEditSession,
  initialAppendBlankExercise,
  setInitialAppendBlankExercise,
  setShowActivityInput,
  handleExerciseFormSave,
  calendarEntryToInitialExercise,
}) {
  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise</h4>
        </div>
        <button type="button" onClick={() => setShowActivityInput(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {selectedDate && (
        <div className="mb-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Date</span>
            </p>
            <p className="text-base text-gray-900 dark:text-white font-medium">
              {selectedDate.toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
      <section className="space-y-4 mb-4" aria-label="Time">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time
          </label>
          <TimePicker value={time} onChange={(newTime) => setTime(newTime)} />
        </div>
      </section>
      <ExerciseForm
        key={`ex-${formState.id ?? 'new'}-${(exerciseEditSession?.sessionEntryIds || []).join('-')}${initialAppendBlankExercise ? '-append' : ''}`}
        embedded
        selectedDate={selectedDate}
        time={time}
        onSave={handleExerciseFormSave}
        onCancel={() => {
          setShowActivityInput(false);
          setInitialAppendBlankExercise(false);
        }}
        initialAppendBlankExercise={initialAppendBlankExercise}
        initialExercises={
          formState.id != null
            ? exerciseEditSession?.initialExercises?.length
              ? exerciseEditSession.initialExercises
              : [calendarEntryToInitialExercise({
                  id: formState.id,
                  name: formState.name,
                  type: 'exercise',
                  sets: formState.sets,
                  notes: formState.notes,
                  videoUrl: formState.videoUrl,
                })].filter(Boolean)
            : undefined
        }
        editId={formState.id != null ? formState.id : undefined}
        editSessionEntryIds={
          formState.id != null
            ? exerciseEditSession?.sessionEntryIds ?? [formState.id]
            : []
        }
      />
    </div>
  );
}
