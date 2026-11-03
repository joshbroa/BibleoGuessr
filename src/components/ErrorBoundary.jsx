import { Component } from 'react';

/**
 * Last line of defence against a blank page.
 *
 * Without this, any render-time exception anywhere in the tree unmounts the
 * whole app and leaves the visitor staring at a white screen with no hint that
 * anything went wrong or what to do about it.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[app] unhandled render error', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gilt-500">
          Something broke
        </p>
        <h1 className="font-display text-3xl font-bold text-parchment-50">
          The page could not be shown
        </h1>
        <p className="max-w-md text-parchment-300">
          Sorry — that is our fault, not yours. Reloading usually clears it. Any game you were
          part-way through is stored on the server, so you have not lost it.
        </p>

        {import.meta.env.DEV && (
          <pre className="max-w-xl overflow-auto rounded-md border border-red-500/40 bg-red-950/40 p-3 text-left text-xs text-red-200">
            {String(error?.stack || error)}
          </pre>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            className="btn-primary px-6 py-2.5"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <a href="/home" className="btn-secondary px-6 py-2.5">
            Return Home
          </a>
        </div>
      </main>
    );
  }
}
