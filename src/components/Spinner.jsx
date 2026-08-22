export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-gilt-600/30 border-t-gilt-400"
        aria-hidden="true"
      />
      <span className="text-sm text-parchment-400">{label}</span>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
