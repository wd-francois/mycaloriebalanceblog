// ── Shared buttons ─────────────────────────────────────────────────────────────
export default function FormButtons({ onCancel, submitLabel = 'Save' }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        Cancel
      </button>
      <button type="submit"
        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all">
        {submitLabel}
      </button>
    </div>
  );
}
