import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const LABEL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

const emptyExercise = () => ({ name: '', sets: '', reps: '', weight: '', notes: '' });

// ── Exercise row inside the builder ──────────────────────────────────────────
function ExerciseRow({ row, index, onChange, onRemove, showRemove }) {
  return (
    <div className="bg-gray-50 dark:bg-[var(--color-bg-subtle)] rounded-xl p-3 flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <input
          className={INPUT + ' flex-1'}
          value={row.name}
          onChange={e => onChange(index, 'name', e.target.value)}
          placeholder="Exercise name"
        />
        {showRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Sets</p>
          <input className={INPUT} value={row.sets}
            onChange={e => onChange(index, 'sets', e.target.value)} placeholder="3" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Reps</p>
          <input className={INPUT} value={row.reps}
            onChange={e => onChange(index, 'reps', e.target.value)} placeholder="10" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Weight</p>
          <input className={INPUT} value={row.weight}
            onChange={e => onChange(index, 'weight', e.target.value)} placeholder="kg / lbs" />
        </div>
      </div>
      <input
        className={INPUT}
        value={row.notes}
        onChange={e => onChange(index, 'notes', e.target.value)}
        placeholder="Notes (optional — e.g. tempo, cues)"
      />
    </div>
  );
}

// ── Program builder / editor ──────────────────────────────────────────────────
function ProgramEditor({ program, clients, onSave, onCancel }) {
  const [name, setName]         = useState(program?.name ?? '');
  const [description, setDesc]  = useState(program?.description ?? '');
  const [exercises, setExercises] = useState(() => {
    if (program?.exercises) {
      try { return JSON.parse(program.exercises); } catch {}
    }
    return [emptyExercise()];
  });
  const [selectedClients, setSelectedClients] = useState(
    () => new Set((program?.assignedTo ?? []).map(c => c.id))
  );
  const [saving, setSaving] = useState(false);

  const updateRow = (i, field, val) =>
    setExercises(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeRow = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const addRow    = () => setExercises(prev => [...prev, emptyExercise()]);

  const toggleClient = (id) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        exercises: JSON.stringify(exercises.filter(e => e.name.trim())),
        assignedTo: [...selectedClients],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Program name & description */}
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
        <div>
          <label className={LABEL}>Program name</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Upper Body A" autoFocus />
        </div>
        <div>
          <label className={LABEL}>Description (optional)</label>
          <input className={INPUT} value={description} onChange={e => setDesc(e.target.value)}
            placeholder="e.g. Push-focused, 4×/week" />
        </div>
      </div>

      {/* Exercises */}
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
        <p className={LABEL}>Exercises</p>
        {exercises.map((row, i) => (
          <ExerciseRow
            key={i}
            row={row}
            index={i}
            onChange={updateRow}
            onRemove={removeRow}
            showRemove={exercises.length > 1}
          />
        ))}
        <button type="button" onClick={addRow}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add exercise
        </button>
      </div>

      {/* Assign to clients */}
      {clients.length > 0 && (
        <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2">
          <p className={LABEL}>Assign to clients</p>
          {clients.map(client => {
            const checked = selectedClients.has(client.id);
            return (
              <label key={client.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  checked
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`} onClick={() => toggleClient(client.id)}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{client.name}</p>
                  {client.email && client.name !== client.email && (
                    <p className="text-xs text-gray-400">{client.email}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={!name.trim() || saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save program'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProPrograms() {
  const programs     = useQuery(api.programs.list) ?? [];
  const rawClients   = useQuery(api.coaches.getClients) ?? [];
  const createProg   = useMutation(api.programs.create);
  const updateProg   = useMutation(api.programs.update);
  const removeProg   = useMutation(api.programs.remove);
  const assignProg   = useMutation(api.programs.assign);
  const unassignProg = useMutation(api.programs.unassign);

  const [view, setView]           = useState('list'); // 'list' | 'new' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const clients = rawClients.map(c => ({
    id: c.id,
    name: c.name || c.email || 'Client',
    email: c.email,
  }));

  const handleSave = async ({ name, description, exercises, assignedTo }) => {
    if (view === 'new') {
      const programId = await createProg({ name, description, exercises });
      // Assign to selected clients
      await Promise.all(assignedTo.map(clientId => assignProg({ programId, clientId })));
    } else if (view === 'edit' && editTarget) {
      await updateProg({ programId: editTarget._id, name, description, exercises });
      // Diff assignments
      const prevIds = new Set((editTarget.assignedTo ?? []).map(c => c.id));
      const nextIds = new Set(assignedTo);
      await Promise.all([
        ...[...nextIds].filter(id => !prevIds.has(id)).map(clientId =>
          assignProg({ programId: editTarget._id, clientId })
        ),
        ...[...prevIds].filter(id => !nextIds.has(id)).map(clientId =>
          unassignProg({ programId: editTarget._id, clientId })
        ),
      ]);
    }
    setView('list');
    setEditTarget(null);
  };

  const handleDelete = async (programId) => {
    setDeleting(programId);
    try { await removeProg({ programId }); }
    finally { setDeleting(null); }
  };

  // ── Editor view ─────────────────────────────────────────────────────────────
  if (view === 'new' || view === 'edit') {
    return (
      <div className="w-full">
        <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setEditTarget(null); }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {view === 'new' ? 'New Program' : 'Edit Program'}
            </h1>
          </div>
          <ProgramEditor
            program={editTarget}
            clients={clients}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditTarget(null); }}
          />
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Programs</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {programs.length} program{programs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setView('new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New program
          </button>
        </div>

        {/* Empty state */}
        {programs.length === 0 && (
          <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No programs yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Create a program and assign it to your clients.
            </p>
          </div>
        )}

        {/* Program cards */}
        <div className="flex flex-col gap-3">
          {programs.map(program => {
            let exercises = [];
            try { exercises = JSON.parse(program.exercises); } catch {}

            return (
              <div key={program._id}
                className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">

                {/* Title row */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{program.name}</p>
                    {program.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{program.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Exercise preview */}
                {exercises.length > 0 && (
                  <div className="bg-gray-50 dark:bg-[var(--color-bg-subtle)] rounded-xl px-3 py-2 flex flex-col gap-1">
                    {exercises.slice(0, 4).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{ex.name}</span>
                        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                          {[ex.sets && `${ex.sets}×`, ex.reps && `${ex.reps}`, ex.weight && ex.weight].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    ))}
                    {exercises.length > 4 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">+{exercises.length - 4} more</p>
                    )}
                  </div>
                )}

                {/* Assigned clients */}
                {program.assignedTo?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {program.assignedTo.map(c => (
                      <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { setEditTarget(program); setView('edit'); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(program._id)}
                    disabled={deleting === program._id}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                    {deleting === program._id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
