import { useState, useEffect } from 'react';

const BASE  = 'https://oss.exercisedb.dev/api/v1';
const LIMIT = 25;

// Hardcoded — the V1 API has no list endpoints for these
const BODY_PARTS     = ['back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs', 'waist'];
const EQUIPMENTS     = ['assisted', 'band', 'barbell', 'body weight', 'cable', 'dumbbell', 'leverage machine', 'resistance band', 'roller', 'sled machine', 'smith machine', 'weighted'];
const TARGET_MUSCLES = ['abductors', 'abs', 'biceps', 'calves', 'cardiovascular system', 'delts', 'glutes', 'hamstrings', 'lats', 'pectorals', 'quads', 'spine', 'triceps'];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ExercisePickerModal({ onSelect, onClose }) {
  const [query, setQuery]             = useState('');
  const [filterType, setFilterType]   = useState('bodyParts');
  const [filterValue, setFilterValue] = useState('');
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [offset, setOffset]           = useState(0);
  const [hasMore, setHasMore]         = useState(true);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching    = debouncedQuery.trim().length >= 2;

  // Reset pagination when search/filter changes
  useEffect(() => {
    setOffset(0);
    setResults([]);
    setHasMore(true);
  }, [debouncedQuery, filterType, filterValue]);

  // Fetch exercises
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: LIMIT, offset });
    const q = debouncedQuery.trim();
    if (q.length >= 2) {
      params.set('name', q);
    } else if (filterValue) {
      params.set(filterType, filterValue);
    }

    fetch(`${BASE}/exercises?${params}`)
      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(json => {
        if (cancelled) return;
        const list = Array.isArray(json.data) ? json.data : [];
        setResults(prev => offset === 0 ? list : [...prev, ...list]);
        setHasMore(json.meta?.hasNextPage ?? false);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load exercises. Check your connection.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery, filterType, filterValue, offset]);

  const filterOptions = filterType === 'bodyParts'  ? BODY_PARTS
    : filterType === 'equipments'  ? EQUIPMENTS
    : TARGET_MUSCLES;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl h-[90vh] sm:h-[85vh] bg-white dark:bg-[var(--color-bg-muted)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Exercise Database</h3>
            <p className="text-xs text-gray-400 mt-0.5">1,500+ exercises · tap to select</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              autoFocus
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-subtle)] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Search by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs + chips (hidden while name-searching) */}
        {!isSearching && (
          <div className="px-4 pb-2 flex-shrink-0 flex flex-col gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {[['bodyParts', 'Body Part'], ['equipments', 'Equipment'], ['targetMuscles', 'Muscle']].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => { setFilterType(val); setFilterValue(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === val ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button type="button" onClick={() => setFilterValue('')}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${!filterValue ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                All
              </button>
              {filterOptions.map(opt => (
                <button key={opt} type="button" onClick={() => setFilterValue(opt)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${filterValue === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-red-500">{error}</p>
              <button type="button" onClick={() => { setOffset(0); setResults([]); setHasMore(true); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Retry
              </button>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              {isSearching ? `No results for "${debouncedQuery}"` : 'No exercises found'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              {results.map(ex => (
                <button
                  key={ex.exerciseId ?? ex.name}
                  type="button"
                  onClick={() => onSelect({ name: ex.name, gifUrl: ex.gifUrl })}
                  className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-subtle)] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all overflow-hidden"
                >
                  {ex.gifUrl && (
                    <div className="bg-white dark:bg-gray-900 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
                      <img src={ex.gifUrl} alt={ex.name} loading="lazy" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 capitalize leading-tight line-clamp-2">{ex.name}</p>
                    {ex.bodyParts?.[0] && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize mt-0.5">{ex.bodyParts[0]}</p>
                    )}
                  </div>
                </button>
              ))}
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700" style={{ aspectRatio: '1 / 1' }} />
                  <div className="p-2 space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasMore && results.length > 0 && (
            <div className="px-4 pb-4">
              <button type="button" onClick={() => setOffset(o => o + LIMIT)}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Attribution */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Exercise data by{' '}
            <a href="https://oss.exercisedb.dev" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              ExerciseDB
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
