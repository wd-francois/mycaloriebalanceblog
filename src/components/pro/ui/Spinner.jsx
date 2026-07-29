// Shared spinner — consolidates the `border-2 border-t-transparent
// animate-spin` circle hand-rolled across ~7 Pro components (ProApp,
// ProClients, ProClientDetail, ProInsights, ProMessages, ProDayModal) with
// only size/color varying between them.

const SIZES = {
  xs: 'w-3.5 h-3.5 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-7 h-7 border-2',
  xl: 'w-8 h-8 border-2',
};

const COLORS = {
  blue: 'border-blue-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  red: 'border-red-400 border-t-transparent',
};

export default function Spinner({ size = 'md', color = 'blue', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-full animate-spin ${SIZES[size] ?? SIZES.md} ${COLORS[color] ?? COLORS.blue} ${className}`}
    />
  );
}
