import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const LABEL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

const emptyExercise = () => ({
  id: Date.now() + Math.random(),
  name: '', load: '', reps: '', extraSets: [], notes: '', videoUrl: '', expanded: true,
});

// Normalise exercises saved in the old flat format {name,sets,reps,weight,notes}
function normaliseEx(e) {
  if (e.extraSets !== undefined || e.load !== undefined) return e;
  const count = Math.max(1, parseInt(e.sets) || 1);
  const load  = e.weight || '';
  const reps  = e.reps   || '';
  return { ...emptyExercise(), name: e.name || '', load, reps, notes: e.notes || '',
    extraSets: Array.from({ length: count - 1 }, () => ({ load, reps })) };
}

const SET_INPUT = 'w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

// ── Exercise card (collapsible, per-set rows) ─────────────────────────────────
function ExerciseCard({ ex, index, onChange, onRemove }) {
  const totalSets = 1 + (ex.extraSets?.length ?? 0);
  const done = !!(ex.name && (ex.reps || ex.load));

  const addSet = () => {
    const last = ex.extraSets?.length > 0 ? ex.extraSets[ex.extraSets.length - 1] : { load: ex.load, reps: ex.reps };
    onChange({ ...ex, extraSets: [...(ex.extraSets ?? []), { load: last.load || '', reps: last.reps || '' }] });
  };

  const removeSet = (row) => {
    if (row === 0) {
      if (!ex.extraSets?.length) return;
      const [first, ...rest] = ex.extraSets;
      onChange({ ...ex, load: first.load ?? '', reps: first.reps ?? '', extraSets: rest });
    } else {
      onChange({ ...ex, extraSets: ex.extraSets.filter((_, i) => i !== row - 1) });
    }
  };

  const syncExtras = (field, val) =>
    (ex.extraSets ?? []).map(s => (!s[field] && val) ? { ...s, [field]: val } : s);

  return (
    <div className={`rounded-xl border transition-all ${done ? 'border-blue-500/30' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-[var(--color-bg-muted)]`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...ex, expanded: !ex.expanded })}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
          {done
            ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate min-w-0 ${ex.name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {ex.name || 'New exercise'}
        </span>
        <span className="text-xs text-gray-400 shrink-0 mr-1 hidden sm:block">
          {totalSets} set{totalSets !== 1 ? 's' : ''}{done && (ex.load || ex.reps) ? ` · ${ex.load || '—'} · ${ex.reps || '—'} reps` : ''}
        </span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${ex.expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {ex.expanded && (
        <div className="px-3.5 pb-3.5 border-t border-gray-200 dark:border-gray-600/50 pt-3 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className={LABEL}>Exercise</label>
            <input className={INPUT} value={ex.name} placeholder="e.g. Bench Press"
              onChange={e => onChange({ ...ex, name: e.target.value })} />
          </div>

          {/* Sets table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-white/[0.04] p-3 flex flex-col gap-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 pb-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase text-center">Set</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Load</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Reps</span>
              <span />
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center tabular-nums">1</span>
              <input className={SET_INPUT} value={ex.load} placeholder="—"
                onChange={e => onChange({ ...ex, load: e.target.value, extraSets: syncExtras('load', e.target.value) })} />
              <input className={SET_INPUT} value={ex.reps} placeholder="—"
                onChange={e => onChange({ ...ex, reps: e.target.value, extraSets: syncExtras('reps', e.target.value) })} />
              <div className="flex justify-center">
                {totalSets > 1 && (
                  <button type="button" onClick={() => removeSet(0)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            {/* Extra rows */}
            {(ex.extraSets ?? []).map((s, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center tabular-nums">{i + 2}</span>
                <input className={SET_INPUT} value={s.load || ''} placeholder="—"
                  onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, load: e.target.value } : x) })} />
                <input className={SET_INPUT} value={s.reps || ''} placeholder="—"
                  onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) })} />
                <div className="flex justify-center">
                  <button type="button" onClick={() => removeSet(i + 1)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {/* Add Set */}
            <div className="flex justify-center pt-1">
              <button type="button" onClick={addSet}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Set
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes</label>
            <textarea rows={2} className={INPUT + ' resize-none'} value={ex.notes} placeholder="Additional notes..."
              onChange={e => onChange({ ...ex, notes: e.target.value })} />
          </div>

          {/* Video Link */}
          <div>
            <label className={LABEL}>Video Link</label>
            <input type="url" className={INPUT} value={ex.videoUrl || ''}
              onChange={e => onChange({ ...ex, videoUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Program builder / editor ──────────────────────────────────────────────────
function ProgramEditor({ program, clients, onSave, onCancel }) {
  const [name, setName]         = useState(program?.name ?? '');
  const [description, setDesc]  = useState(program?.description ?? '');
  const [exercises, setExercises] = useState(() => {
    if (program?.exercises) {
      try { return JSON.parse(program.exercises).map(normaliseEx); } catch {}
    }
    return [emptyExercise()];
  });
  const [selectedClients, setSelectedClients] = useState(
    () => new Set((program?.assignedTo ?? []).map(c => c.id))
  );
  const [saving, setSaving] = useState(false);

  const updateEx = (i, updated) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? updated : ex));
  const removeEx = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const addEx    = () => setExercises(prev => [...prev.map(e => ({ ...e, expanded: false })), emptyExercise()]);

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
    <div className="flex flex-col lg:flex-row gap-5 items-start">

      {/* Left column — exercises (takes more space) */}
      <div className="w-full lg:flex-1 bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
        <p className={LABEL}>Exercises</p>
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id ?? i}
            ex={ex}
            index={i}
            onChange={updated => updateEx(i, updated)}
            onRemove={() => removeEx(i)}
          />
        ))}
        <button type="button" onClick={addEx}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Exercise
        </button>
      </div>

      {/* Right column — details + actions (fixed width on desktop) */}
      <div className="w-full lg:w-80 flex flex-col gap-4">

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

        {/* Assign to clients */}
        {clients.length > 0 && (
          <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2">
            <p className={LABEL}>Assign to clients</p>
            {clients.map(client => {
              const checked = selectedClients.has(client.id);
              return (
                <label key={client.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
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
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    {exercises.slice(0, 4).map((ex, i) => {
                      const n = ex.extraSets !== undefined
                        ? 1 + (ex.extraSets?.length ?? 0)
                        : (parseInt(ex.sets) || 1);
                      const load = ex.load ?? ex.weight ?? '';
                      const reps = ex.reps ?? '';
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{ex.name}</span>
                          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                            {[n > 1 && `${n}×`, reps && reps, load && load].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      );
                    })}
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
