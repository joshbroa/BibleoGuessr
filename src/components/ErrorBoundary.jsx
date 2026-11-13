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

    // Styled like the 404 page. This sits outside the router (it has to catch
    // errors from the router too), so it uses plain links, not <Link>.
    return (
      <div className="wf-root flex min-h-screen flex-col">
        <div aria-hidden="true" className="h-2 bg-wf-ink sm:h-2.5" />
        <main className="mx-auto box-border flex w-full max-w-[720px] flex-1 flex-col items-start justify-center gap-4 px-4 py-10 sm:gap-[18px] sm:px-8">
          <span className="text-[15px] font-extrabold text-wf-crimson sm:text-base">Something broke</span>
          <h1 className="m-0 text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-[60px]">
            The page could not be shown
          </h1>
          <p className="m-0 max-w-[520px] text-[17px] leading-normal text-wf-muted2 sm:text-[19px]">
            Sorry — that is our fault, not yours. Reloading usually clears it. Any game you were
            part-way through is stored on the server, so you have not lost it.
          </p>

          {import.meta.env.DEV && (
            <pre className="m-0 max-w-full overflow-auto rounded border-2 border-wf-crimson bg-wf-crimsontint p-3 text-left text-xs text-wf-crimsondeep">
              {String(error?.stack || error)}
            </pre>
          )}

          <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" className="wf-btn-amber wf-btn-lg" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a href="/home" className="wf-btn-outline text-[17px]" style={{ padding: '17px 22px 14px' }}>
              Return Home
            </a>
          </div>
        </main>
      </div>
    );
  }
}
