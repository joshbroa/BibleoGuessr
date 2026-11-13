import { Link } from 'react-router-dom';
import { LogoHeader, useWfBody } from './PageShell';
import WfFooter from './WfFooter';
import { AlertIcon, ArrowLeft } from './Icons';

/**
 * Login, sign up and password reset: the wordmark and a Back button across the
 * top, one narrow card in the middle, the standard footer.
 *
 * @param {string} backTo  where Back goes
 * @param {string} homeTo  where the wordmark goes
 */
export default function AuthShell({ backTo, homeTo = '/', children, top = 'sm:pt-16' }) {
  useWfBody();

  return (
    <div className="wf-root flex min-h-screen flex-col">
      <LogoHeader
        to={homeTo}
        extra={
          <Link
            to={backTo}
            className="box-border inline-flex h-11 items-center gap-2 rounded border-2 border-wf-line pl-3 pr-3 text-[15px] font-bold text-white no-underline hover:border-white sm:pr-3.5"
          >
            <ArrowLeft size={15} color="#e3a52b" />
            <span className="pt-0.5">Back</span>
          </Link>
        }
      />
      <main className={`mx-auto box-border w-full max-w-[520px] flex-1 px-4 pb-7 pt-8 sm:px-8 sm:pb-12 ${top}`}>
        {children}
      </main>
      <WfFooter />
    </div>
  );
}

/**
 * Landing and email-link pages: no navigation at all, just a charcoal rule
 * along the top edge and the content centred beneath it.
 */
export function BarShell({ children, footer = null, className = '' }) {
  useWfBody();

  return (
    <div className="wf-root flex min-h-screen flex-col">
      <div aria-hidden="true" className="h-2 bg-wf-ink sm:h-2.5" />
      <main className={`mx-auto box-border flex w-full flex-1 flex-col items-center px-4 ${className}`}>
        {children}
      </main>
      {footer}
    </div>
  );
}

/** A charcoal tray headed by the page's title, holding a form or a message. */
export function FormTray({ title, titleId, icon = null, tone = 'ink', size = 'lg', children }) {
  const titleSize = size === 'lg' ? 'text-[30px] sm:text-[32px] leading-none' : 'text-[26px] sm:text-[28px] leading-[1.05]';
  return (
    <section
      aria-labelledby={titleId}
      className={`wf-dark flex w-full flex-col gap-[5px] rounded-lg p-[5px] sm:gap-1.5 sm:p-1.5 ${
        tone === 'danger' ? 'bg-wf-crimson' : 'bg-wf-ink'
      }`}
    >
      <h1
        id={titleId}
        className={`m-0 flex items-center gap-2.5 px-3 pb-1.5 pt-3 font-extrabold text-white sm:gap-3 sm:px-4 sm:pb-2 sm:pt-3.5 ${titleSize}`}
      >
        {icon}
        {title}
      </h1>
      {children}
    </section>
  );
}

/** The stone panel inside a tray. */
export function TrayPanel({ children, as: Tag = 'div', tone = 'mist', className = '', ...props }) {
  return (
    <Tag
      className={`flex flex-col gap-4 rounded px-3.5 pb-5 pt-[18px] sm:gap-[18px] sm:px-[22px] sm:pb-[26px] sm:pt-6 ${
        tone === 'danger' ? 'bg-wf-crimsonwash' : 'bg-wf-mist text-wf-ink'
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** A labelled text input with optional help text beneath it. */
export function Field({ id, label, help, helpTone = 'muted', helpRole, labelExtra = null, ...input }) {
  const helpId = help ? `${id}-help` : undefined;
  const helpColour =
    helpTone === 'ok' ? 'text-wf-teal font-semibold' : helpTone === 'bad' ? 'text-wf-crimsondeep font-semibold' : 'text-wf-muted';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="wf-label">
          {label}
        </label>
        {labelExtra}
      </div>
      <input id={id} className="wf-input max-sm:h-[52px] sm:h-[50px]" aria-describedby={helpId} {...input} />
      {help && (
        <span id={helpId} role={helpRole} className={`text-sm leading-[1.4] ${helpColour}`}>
          {help}
        </span>
      )}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p className="wf-alert-error m-0" role="alert">
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}

/** "No account? Sign up" — the line under a form, on the charcoal tray. */
export function TrayFootnote({ children }) {
  return <p className="m-0 px-3 pb-2.5 pt-2 text-center text-[15px] text-wf-ondark sm:px-4 sm:pb-3 sm:pt-2.5">{children}</p>;
}

/** A white link on charcoal with an amber underline. */
export function TrayLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-block py-2 font-bold text-white underline decoration-wf-amber decoration-2 underline-offset-4 sm:py-0"
    >
      {children}
    </Link>
  );
}
