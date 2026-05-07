const ICONS = {
  meals: {
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v11.5a3.5 3.5 0 007 0V3M5 8h7M19 3v18" />
      </svg>
    ),
  },
  exercise: {
    color: 'bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  sleep: {
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
  measurements: {
    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  weight: {
    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M12 3l4 8H8l4-8zm-3.5 8l-1.5 7m10-7l1.5 7" />
      </svg>
    ),
  },
  generic: {
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
    svg: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
};

export function EmptyState({
  type = 'generic',
  title = 'Nothing here yet',
  description = '',
  ctaLabel = '',
  ctaHref = '',
  onCtaClick,
}) {
  const { color, svg } = ICONS[type] ?? ICONS.generic;

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
        {svg}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">{description}</p>
      )}
      {(ctaHref || onCtaClick) && ctaLabel && (
        ctaHref ? (
          <a
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {ctaLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={onCtaClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {ctaLabel}
          </button>
        )
      )}
    </div>
  );
}
