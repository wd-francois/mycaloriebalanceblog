import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ClientCommentInput } from './EntryCard';

// A comment with no entry or photo attached is about the whole day's workout:
// the "final comment" the client leaves when logging a session, or a coach's
// reply to it. Shown under the day's entries rather than on one exercise.
export const isWorkoutComment = (c) => !c.entryId && !c.photoId;

// Isolated so a query error doesn't crash the modal.
export default function WorkoutComments({ dateStr, hasWorkout }) {
  const self       = useQuery(api.users.viewer);
  const comments   = useQuery(
    api.comments.listForClient,
    self?._id ? { targetUserId: self._id } : 'skip'
  ) ?? [];
  const addComment = useMutation(api.comments.add);
  const delComment = useMutation(api.comments.remove);

  const dayComments = comments.filter(c => c.date === dateStr && isWorkoutComment(c));
  const canComment  = hasWorkout && !!self?._id;
  if (dayComments.length === 0 && !canComment) return null;

  return (
    <div className="mt-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10 px-4 py-3 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Workout comments</p>
      {dayComments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">No final comment on this workout yet.</p>
      )}
      {dayComments.map(c => {
        const mine = c.authorId === self?._id;
        return (
          <div key={c._id} className="flex items-start gap-2 group">
            <span className={`text-[10px] font-bold flex-shrink-0 mt-px w-10 ${mine ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {mine ? 'You' : 'Coach'}
            </span>
            <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{c.text}</p>
            {mine && (
              <button
                type="button"
                onClick={() => delComment({ id: c._id })}
                title="Delete comment"
                aria-label="Delete comment"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs text-red-400 hover:text-red-600 transition-all flex-shrink-0 px-1"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {canComment && (
        <ClientCommentInput
          placeholder="Add a final comment about this workout…"
          onSubmit={text => addComment({ targetUserId: self._id, date: dateStr, text })}
        />
      )}
    </div>
  );
}
