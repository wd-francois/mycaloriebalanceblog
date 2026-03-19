import { useEffect, useMemo, useRef, useState } from 'react';
import healthDB from '../lib/database.js';
import { formatTime } from '../lib/utils';

// Simple CSV/TSV importer for exercise items.
// Supports:
// - comma-separated (CSV) and tab-separated (TSV)
// - quoted values with escaped quotes ("" -> ")
function parseDelimited(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = normalized.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cur.trim());
      cur = '';
      continue;
    }

    if (!inQuotes && ch === '\n') {
      if (row.length === 1 && row[0] === '' && cur === '') continue;
      row.push(cur.trim());
      rows.push(row);
      row = [];
      cur = '';
      continue;
    }

    cur += ch;
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getCellByHeader(row, headers, aliases) {
  const headerIndex = headers.findIndex((h) => aliases.includes(h));
  if (headerIndex === -1) return '';
  return row[headerIndex] ?? '';
}

function asNumber(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  return Number.isFinite(n) ? n : '';
}

function truthy(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  if (['true', 'yes', 'y', '1', 'enabled', 'enable'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'disabled', 'disable'].includes(s)) return false;
  return undefined;
}

function toLocalDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !Number.isNaN(dateVal.getTime())) {
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }
  const s = String(dateVal);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T12:00:00');
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toEntryDateTime(entry) {
  const d = toLocalDate(entry.date);
  if (!d || !entry.time) return null;
  const t = entry.time;
  const hour = Number(t.hour);
  const minute = Number(t.minute ?? 0);
  const period = String(t.period ?? '').toUpperCase();
  if (!Number.isFinite(hour) || !period) return null;

  let h24 = hour;
  if (period === 'AM') {
    h24 = hour === 12 ? 0 : hour;
  } else if (period === 'PM') {
    h24 = hour === 12 ? 12 : hour + 12;
  }

  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h24, minute, 0, 0);
}

const ExerciseLibraryManager = () => {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('exercises'); // exercises | history

  const [exercises, setExercises] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);

  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    defaultSets: '',
    defaultReps: '',
    muscleGroups: '',
    difficulty: '',
    enabled: true
  });

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedCount, setImportedCount] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  const load = async () => {
    setLoading(true);
    setImportError('');
    setImportedCount(null);
    try {
      await healthDB.init();
      await healthDB.initializeSampleData();

      const loadedExercises = await healthDB.getExerciseItems('', 2000);
      setExercises(Array.isArray(loadedExercises) ? loadedExercises : []);

      const allEntries = await healthDB.getAllUserEntries();
      const filtered = (Array.isArray(allEntries) ? allEntries : [])
        .filter((e) => e && (e.type === 'exercise' || e.type === 'activity'))
        .sort((a, b) => {
          const da = toEntryDateTime(a);
          const db = toEntryDateTime(b);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.getTime() - da.getTime();
        });
      setHistoryEntries(filtered);
    } catch (e) {
      console.error(e);
      setImportError('Failed to load exercise library / history.');
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = useMemo(() => {
    const q = String(search).trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => String(e?.name ?? '').toLowerCase().includes(q));
  }, [exercises, search]);

  const openAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      category: '',
      description: '',
      defaultSets: '',
      defaultReps: '',
      muscleGroups: '',
      difficulty: '',
      enabled: true
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item?.id ?? null);
    setForm({
      name: item?.name ?? '',
      category: item?.category ?? '',
      description: item?.description ?? '',
      defaultSets: item?.defaultSets != null ? String(item.defaultSets) : '',
      defaultReps: item?.defaultReps != null ? String(item.defaultReps) : '',
      muscleGroups: item?.muscleGroups ?? '',
      difficulty: item?.difficulty ?? '',
      enabled: item?.enabled !== false
    });
    setShowModal(true);
  };

  const saveExercise = async () => {
    const name = String(form.name || '').trim();
    if (!name) {
      alert('Exercise name is required.');
      return;
    }

    const payload = {
      name,
      category: String(form.category || '').trim(),
      description: String(form.description || '').trim(),
      defaultSets: asNumber(form.defaultSets),
      defaultReps: asNumber(form.defaultReps),
      muscleGroups: String(form.muscleGroups || '').trim(),
      difficulty: String(form.difficulty || '').trim(),
      enabled: !!form.enabled
    };

    try {
      if (editId != null) {
        await healthDB.updateItem('exercise', editId, payload);
      } else {
        await healthDB.addItem('exercise', payload);
      }
      setShowModal(false);
      await load();
      if (searchRef.current) searchRef.current.focus();
    } catch (e) {
      console.error(e);
      alert('Failed to save exercise. Please try again.');
    }
  };

  const deleteExercise = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Delete exercise "${item.name}"?`);
    if (!ok) return;
    try {
      await healthDB.deleteItem('exercise', item.id);
      await load();
    } catch (e) {
      console.error(e);
      alert('Failed to delete exercise. Please try again.');
    }
  };

  const handleImportFile = async (file) => {
    setImportError('');
    setImportedCount(null);
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseDelimited(text);
      if (!rows || rows.length < 2) {
        setImportError('Could not read any rows. Make sure your CSV/TSV has a header row.');
        return;
      }

      const rawHeaders = rows[0];
      const headers = rawHeaders.map(normalizeHeader);

      const nameHeaderIndex = headers.findIndex((h) => ['name', 'exercise', 'exercise name'].includes(h));
      if (nameHeaderIndex === -1) {
        setImportError('Header column "name" is required (e.g., name, exercise name).');
        return;
      }

      const aliasMap = {
        name: ['name', 'exercise name', 'exercise'],
        category: ['category'],
        description: ['description', 'desc'],
        defaultSets: ['defaultsets', 'default sets', 'sets'],
        defaultReps: ['defaultreps', 'default reps', 'reps'],
        muscleGroups: ['musclegroups', 'muscle groups'],
        difficulty: ['difficulty'],
        enabled: ['enabled', 'active']
      };

      const imported = [];
      const maxRows = 2000;
      for (let i = 1; i < Math.min(rows.length, maxRows + 1); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const name = getCellByHeader(row, headers, aliasMap.name);
        if (!String(name).trim()) continue;

        const category = getCellByHeader(row, headers, aliasMap.category);
        const description = getCellByHeader(row, headers, aliasMap.description);
        const defaultSets = getCellByHeader(row, headers, aliasMap.defaultSets);
        const defaultReps = getCellByHeader(row, headers, aliasMap.defaultReps);
        const muscleGroups = getCellByHeader(row, headers, aliasMap.muscleGroups);
        const difficulty = getCellByHeader(row, headers, aliasMap.difficulty);
        const enabledRaw = getCellByHeader(row, headers, aliasMap.enabled);

        const enabled = truthy(enabledRaw);

        imported.push({
          name: String(name).trim(),
          category: String(category || '').trim(),
          description: String(description || '').trim(),
          defaultSets: asNumber(defaultSets),
          defaultReps: asNumber(defaultReps),
          muscleGroups: String(muscleGroups || '').trim(),
          difficulty: String(difficulty || '').trim(),
          enabled: enabled === undefined ? true : enabled
        });
      }

      if (imported.length === 0) {
        setImportError('No valid exercises found in the import file.');
        return;
      }

      for (const item of imported) {
        await healthDB.addItem('exercise', item);
      }

      setImportedCount(imported.length);
      await load();
    } catch (e) {
      console.error(e);
      setImportError('Import failed. Please upload a valid CSV/TSV export.');
    } finally {
      setImporting(false);
    }
  };

  const groupedHistory = useMemo(() => {
    const groups = [];
    let lastKey = null;
    for (const entry of historyEntries) {
      const d = toLocalDate(entry.date);
      const key = d ? d.toDateString() : 'Unknown date';
      if (key !== lastKey) {
        groups.push({ key, date: d, items: [entry] });
        lastKey = key;
      } else {
        groups[groups.length - 1].items.push(entry);
      }
    }
    return groups;
  }, [historyEntries]);

  if (!isClient) return null;

  return (
    <div className="w-full text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setTab('exercises')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${tab === 'exercises'
                ? 'border-green-500 text-green-700 dark:text-green-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">💪</span>
                Exercises ({exercises.length})
              </div>
            </button>
            <button
              onClick={() => setTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${tab === 'history'
                ? 'border-green-500 text-green-700 dark:text-green-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🗂️</span>
                Exercise History ({historyEntries.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
        </div>
      )}

      {!loading && tab === 'exercises' && (
        <div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Exercise Library
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add, edit, delete, and import exercises.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={openAdd}
                className="px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Exercise
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find exercise by name..."
                className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Import (CSV / TSV)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Spreadsheet tip: export to CSV, then upload here.
              </p>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
                className="mt-3 w-full text-sm text-gray-600 dark:text-gray-300"
              />
              {importing && <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">Importing...</div>}
              {importError && <div className="text-sm text-red-600 mt-2">{importError}</div>}
              {importedCount != null && (
                <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                  Imported {importedCount} exercise(s).
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Required header: <span className="font-mono">name</span>. Optional headers: <span className="font-mono">category</span>, <span className="font-mono">description</span>, <span className="font-mono">defaultSets</span>, <span className="font-mono">defaultReps</span>, <span className="font-mono">muscleGroups</span>, <span className="font-mono">difficulty</span>, <span className="font-mono">enabled</span>.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-gray-950 dark:border-green-700 ${item.enabled === false ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    {item.category && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Category: {item.category}
                      </div>
                    )}
                    {(item.muscleGroups || item.difficulty) && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {item.muscleGroups ? `Muscles: ${item.muscleGroups}` : ''}
                        {item.muscleGroups && item.difficulty ? ' · ' : ''}
                        {item.difficulty ? `Difficulty: ${item.difficulty}` : ''}
                      </div>
                    )}
                    {(item.defaultSets != null || item.defaultReps != null) && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Default: {item.defaultSets != null && item.defaultSets !== '' ? item.defaultSets : '—'} sets · {item.defaultReps != null && item.defaultReps !== '' ? item.defaultReps : '—'} reps
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteExercise(item)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">No exercises found.</div>
              <button
                onClick={openAdd}
                className="px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 bg-green-600 hover:bg-green-700"
              >
                Add Exercise
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'history' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Exercise History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This is your saved exercise history from daily entries.
            </p>
          </div>

          {historyEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">No exercise history yet.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedHistory.map((group) => (
                <div key={group.key} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[var(--color-bg-muted)]">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {group.date ? group.date.toLocaleDateString() : group.key}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {group.items.map((entry) => (
                      <div key={entry.id} className="p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {entry.name || 'Exercise'}
                          </div>
                          {entry.time && typeof entry.time === 'object' && entry.time.hour != null && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {formatTime(entry.time)}
                            </div>
                          )}

                          {Array.isArray(entry.sets) && entry.sets.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {entry.sets.map((s, idx) => (
                                <div key={idx} className="text-xs text-gray-700 dark:text-gray-300">
                                  Set {idx + 1}: {s.reps || '—'} reps{(s.load || s.load === 0) ? ` · ${s.load} load` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {entry.id != null && (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = window.confirm('Delete this exercise entry from history?');
                                if (!ok) return;
                                try {
                                  await healthDB.deleteUserEntry(entry.id);
                                  await load();
                                } catch (e) {
                                  console.error(e);
                                  alert('Failed to delete exercise entry.');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-[var(--color-bg-muted)] border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId != null ? 'Edit Exercise' : 'Add Exercise'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Push-ups"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Bodyweight"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  placeholder="Upper body exercise"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Sets</label>
                  <input
                    value={form.defaultSets}
                    onChange={(e) => setForm((p) => ({ ...p, defaultSets: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Reps</label>
                  <input
                    value={form.defaultReps}
                    onChange={(e) => setForm((p) => ({ ...p, defaultReps: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Muscle Groups</label>
                  <input
                    value={form.muscleGroups}
                    onChange={(e) => setForm((p) => ({ ...p, muscleGroups: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Chest, Triceps"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                  <input
                    value={form.difficulty}
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Beginner"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enabled
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.enabled}
                    onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 rounded-full bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:bg-green-600 transition-colors after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:w-4 after:h-4 after:rounded-full after:bg-white peer-checked:after:translate-x-5 relative" />
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveExercise}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editId != null ? 'Save Changes' : 'Add Exercise'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseLibraryManager;

