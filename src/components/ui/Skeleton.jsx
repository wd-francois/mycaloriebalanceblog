export function SkeletonCard() {
  return (
    <div className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="h-11 bg-gray-100 dark:bg-gray-800 px-4 flex items-center gap-3">
        <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="ml-auto h-3 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="p-4 space-y-2.5">
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-3/5 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
