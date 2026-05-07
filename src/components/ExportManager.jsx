import { useState, useEffect } from 'react';
import { exportToJSON, exportToCSV, exportToPDF } from '../lib/exportUtils.js';

const ExportManager = () => {
  const [lastExport, setLastExport] = useState(null);
  const [entryCount, setEntryCount] = useState(0);
  const [dateCount, setDateCount] = useState(0);
  const [entries, setEntries] = useState({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('healthEntries');
      const parsed = raw ? JSON.parse(raw) : {};
      setEntries(parsed);
      setDateCount(Object.keys(parsed).length);
      setEntryCount(Object.values(parsed).reduce((sum, arr) => sum + arr.length, 0));

      const last = localStorage.getItem('lastExportDate');
      if (last) setLastExport(new Date(last));
    } catch (e) {
      console.error('ExportManager load error:', e);
    }
  }, []);

  const handleExport = (type) => {
    if (type === 'json') exportToJSON(entries);
    if (type === 'csv') exportToCSV(entries, new Date());
    if (type === 'pdf') exportToPDF(entries);
    setLastExport(new Date());
  };

  if (!isClient) return null;

  const hasData = entryCount > 0;

  const formatLastExport = (date) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Last exported banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        lastExport
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <svg className={`w-5 h-5 flex-shrink-0 ${lastExport ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          {lastExport
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          }
        </svg>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${lastExport ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
            {lastExport ? `Last exported: ${formatLastExport(lastExport)}` : 'Never exported'}
          </p>
          <p className={`text-xs mt-0.5 ${lastExport ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {lastExport ? 'Your data is backed up.' : 'Export your data regularly to keep a backup.'}
          </p>
        </div>
      </div>

      {/* Data summary */}
      {hasData && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{entryCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">total entries</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dateCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">days logged</div>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No entries yet. Start logging meals to enable export.</p>
        </div>
      )}

      {/* Export buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Export format</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { type: 'json', label: 'JSON', desc: 'Full data backup', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
            { type: 'csv', label: 'CSV', desc: 'Spreadsheet format', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 19.5m9.75-9.75c0 .621-.504 1.125-1.125 1.125H12m8.625-4.875c0-.621-.504-1.125-1.125-1.125h-8.25m1.5 0V4.875m0 0a1.125 1.125 0 00-1.125-1.125H7.875' },
            { type: 'pdf', label: 'PDF', desc: 'Printable report', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
          ].map(({ type, label, desc, icon }) => (
            <button
              key={type}
              type="button"
              disabled={!hasData}
              onClick={() => handleExport(type)}
              title={`Export as ${label}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportManager;
