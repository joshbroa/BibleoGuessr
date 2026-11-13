import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { POLICY_EFFECTIVE_DATE, SITE_CONFIG_INCOMPLETE } from '@/lib/siteConfig';
import { LogoHeader, Breadcrumb, useWfBody } from '@/components/wf/PageShell';
import { ArrowLeft, ChevronDown } from '@/components/wf/Icons';

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Shared chrome and typography for the policy pages.
 *
 * The policy text itself is plain headings, paragraphs and lists, and is not
 * touched by the design: section numbers, bullets and the "On this page"
 * contents are all derived here, from the headings the text already has.
 */
export default function LegalLayout({ title, children }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const [toc, setToc] = useState([]);
  useWfBody();

  const home = isAuthenticated ? '/home' : '/';

  // Give every section heading an anchor and list it in the contents.
  useEffect(() => {
    const headings = articleRef.current?.querySelectorAll('.legal-body h2') ?? [];
    setToc(
      Array.from(headings).map((heading, index) => {
        if (!heading.id) heading.id = slug(heading.textContent) || `section-${index + 1}`;
        return { id: heading.id, n: index + 1, label: heading.textContent };
      })
    );
  }, [children]);

  function goBack() {
    // Back to wherever the reader came from on this site; home otherwise.
    if (window.history.length > 1) navigate(-1);
    else navigate(home);
  }

  const contents = (
    <nav aria-label="On this page" className="flex flex-col gap-1">
      {toc.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="box-border flex min-h-[44px] items-center gap-2.5 rounded bg-wf-mist px-2.5 py-1.5 text-[15px] font-bold leading-tight text-wf-ink no-underline hover:bg-white md:min-h-10 md:text-sm"
        >
          <span
            aria-hidden="true"
            className="box-border grid h-[22px] flex-[0_0_22px] place-items-center rounded-[3px] bg-wf-ink pt-0.5 text-xs text-wf-amber"
          >
            {item.n}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="wf-root flex min-h-screen flex-col">
      <LogoHeader
        to={home}
        extra={
          <button
            type="button"
            onClick={goBack}
            className="box-border inline-flex h-11 items-center gap-2 rounded border-2 border-wf-line px-3 text-[15px] font-bold text-white md:hidden"
          >
            <ArrowLeft size={15} color="#e3a52b" />
            <span className="pt-0.5">Back</span>
          </button>
        }
      />

      <div className="mx-auto box-border flex w-full max-w-[1160px] flex-1 flex-wrap items-start gap-x-14 gap-y-8 px-4 pb-10 pt-[22px] md:px-8 md:pb-16 md:pt-8">
        <aside className="sticky top-6 hidden flex-[0_0_250px] flex-col gap-3.5 md:flex">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-11 items-center gap-2 self-start rounded bg-wf-ink pl-3 pr-4 text-[15px] font-bold text-white hover:bg-wf-ink2"
          >
            <ArrowLeft color="#e3a52b" />
            <span className="pt-0.5">Back</span>
          </button>
          <div className="wf-dark flex flex-col gap-1 rounded-lg bg-wf-ink p-1.5">
            <span className="px-2.5 pb-1 pt-2 text-[13px] font-bold text-wf-ondark">On this page</span>
            {contents}
          </div>
        </aside>

        <article ref={articleRef} className="min-w-0 max-w-[700px] flex-[1_1_560px] text-base leading-relaxed text-[#2b2f35] md:text-[17px] md:leading-[1.65]">
          <Breadcrumb items={[{ label: 'Home', to: home }, { label: title }]} />
          <h1 className="mb-3 mt-1.5 text-[38px] font-extrabold leading-[0.98] tracking-[-0.025em] text-wf-ink md:mb-3.5 md:mt-2 md:text-[56px] md:leading-[0.95]">
            {title}
          </h1>
          <p className="mb-[18px] mt-0 md:mb-8">
            <span className="inline-block rounded bg-wf-ink px-2.5 pb-[3px] pt-1.5 text-[13px] font-bold text-white md:text-sm">
              Effective {POLICY_EFFECTIVE_DATE}
            </span>
          </p>

          <details className="wf-dark mb-[22px] rounded-md bg-wf-ink p-1 md:hidden">
            <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3 text-[15px] font-bold text-white [&::-webkit-details-marker]:hidden">
              On this page
              <ChevronDown size={14} color="#e3a52b" />
            </summary>
            <div className="py-0.5">{contents}</div>
          </details>

          {SITE_CONFIG_INCOMPLETE && (
            <p className="wf-alert-error mb-8">
              <span>
                <strong>Not ready to publish.</strong> This page still contains placeholder details from{' '}
                <code>src/lib/siteConfig.js</code>. Fill in the operator name and contact address before
                the site goes live.
              </span>
            </p>
          )}

          <div className="legal-body">{children}</div>
        </article>
      </div>

      <footer className="border-t-[6px] border-wf-ink">
        <nav
          aria-label="Legal"
          className="mx-auto box-border flex max-w-[1160px] flex-wrap gap-x-6 gap-y-1.5 px-4 pb-6 pt-4 text-[15px] font-bold md:px-8"
        >
          <LegalLink to="/legal/privacy" current={pathname === '/legal/privacy'}>
            Privacy Policy
          </LegalLink>
          <LegalLink to="/legal/terms" current={pathname === '/legal/terms'}>
            Terms of Service
          </LegalLink>
        </nav>
      </footer>
    </div>
  );
}

function LegalLink({ to, current, children }) {
  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      className={
        current
          ? 'border-b-[3px] border-wf-amber pb-px text-wf-ink no-underline'
          : 'text-wf-muted underline underline-offset-4 hover:text-wf-cobalt'
      }
    >
      {children}
    </Link>
  );
}
