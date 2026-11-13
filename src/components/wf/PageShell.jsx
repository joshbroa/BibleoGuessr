import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import WfFooter from './WfFooter';
import Logo from './Logo';
import { ChevronRight, PinIcon, LogoMark } from './Icons';

/**
 * Paint the document body for a redesigned page while it is mounted, so the
 * area past the page (overscroll, short pages) matches it rather than showing
 * the old dark background through.
 */
export function useWfBody(stage = false) {
  useEffect(() => {
    document.body.classList.add('wf-body');
    if (stage) document.body.classList.add('wf-body-stage');
    return () => {
      document.body.classList.remove('wf-body', 'wf-body-stage');
    };
  }, [stage]);
}

/**
 * A standard redesigned page: header, main column, footer.
 *
 * @param {'nav'|'logo'} header  the full navigation bar, or just the wordmark
 * @param {string} current       which account page, for the nav's highlight
 * @param {string} width         max-width class for the main column
 */
export default function PageShell({
  children,
  header = 'nav',
  current = null,
  width = 'max-w-[1160px]',
  footer = true,
  headerExtra = null,
}) {
  useWfBody();

  return (
    <div className="wf-root flex min-h-screen flex-col">
      {header === 'nav' ? <SiteHeader current={current} /> : <LogoHeader extra={headerExtra} />}
      <main
        id="main"
        className={`mx-auto flex w-full flex-1 flex-col gap-5 px-4 pb-8 pt-5 sm:gap-7 sm:px-8 sm:pb-12 sm:pt-9 ${width}`}
      >
        {children}
      </main>
      {footer && <WfFooter />}
    </div>
  );
}

/** Wordmark-only header, for pages where account links would be a distraction. */
export function LogoHeader({ extra = null, to = '/home' }) {
  return (
    <header className="wf-dark bg-wf-ink">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 py-2 pl-4 pr-3 sm:px-8 sm:py-3">
        <Logo to={to} />
        {extra}
      </div>
    </header>
  );
}

/**
 * Breadcrumb trail: earlier steps as links, the current page in crimson with a
 * "you are here" pin.
 *
 * @param {{label: string, to?: string}[]} items  the last item is the current page
 */
export function Breadcrumb({ items, trailing = null }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm font-bold sm:gap-2 sm:text-[15px]">
      {trailing && <span className="order-last ml-auto font-semibold text-wf-muted">{trailing}</span>}
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return last ? (
          <span key={item.label} aria-current="page" className="flex items-center gap-1.5 text-wf-crimson">
            <PinIcon size={14} />
            {item.label}
          </span>
        ) : (
          <span key={item.label} className="flex items-center gap-1.5 sm:gap-2">
            <Link to={item.to} className="py-1.5 text-wf-muted underline underline-offset-4 hover:text-wf-cobalt">
              {item.label}
            </Link>
            <ChevronRight size={12} color="#4b5158" />
          </span>
        );
      })}
    </nav>
  );
}

/** Breadcrumb, big headline and optional standfirst: the top of most pages. */
export function PageHeading({ crumbs, title, children, size = 'md', crumbTrailing = null }) {
  const titleSize =
    size === 'xl'
      ? 'text-[40px] sm:text-[clamp(42px,6vw,72px)]'
      : 'text-[36px] sm:text-[clamp(40px,5.4vw,56px)]';

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <Breadcrumb items={crumbs} trailing={crumbTrailing} />
      <h1 className={`m-0 font-extrabold leading-[0.97] tracking-[-0.025em] ${titleSize}`}>{title}</h1>
      {children && <p className="m-0 text-base text-wf-muted sm:text-lg">{children}</p>}
    </div>
  );
}

/** Loading state in the redesign's colours. */
export function WfSpinner({ label = 'Loading', className = '', dark = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <span className="relative block h-10 w-10 animate-bounce" aria-hidden="true">
        <LogoMark size={40} ground={dark ? '#23262b' : '#f2f0ea'} />
      </span>
      <span className={`text-[15px] font-bold ${dark ? 'text-wf-ondark' : 'text-wf-muted'}`}>{label}</span>
    </div>
  );
}

/** A whole page that is only loading, in the redesign's colours. */
export function WfFullPageSpinner({ label = 'Loading', stage = false }) {
  useWfBody(stage);
  return (
    <div className={`wf-root flex min-h-screen items-center justify-center ${stage ? 'bg-wf-stage' : ''}`}>
      <WfSpinner label={label} />
    </div>
  );
}
