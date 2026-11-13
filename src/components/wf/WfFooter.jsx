import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/siteConfig';

/** The site footer: a heavy charcoal rule, then the links a public site owes. */
export default function WfFooter() {
  return (
    <footer className="mt-auto border-t-[6px] border-wf-ink">
      <div className="mx-auto flex max-w-[1160px] flex-wrap gap-x-[18px] gap-y-1.5 px-4 pb-[22px] pt-3.5 text-[13px] text-wf-muted sm:gap-x-[22px] sm:px-8 sm:pb-3.5 sm:text-sm">
        <span>
          © {new Date().getFullYear()} {SITE_NAME}
        </span>
        <Link to="/legal/privacy" className="text-wf-ink underline underline-offset-2 hover:text-wf-cobalt">
          Privacy
        </Link>
        <Link to="/legal/terms" className="text-wf-ink underline underline-offset-2 hover:text-wf-cobalt">
          Terms
        </Link>
        <span className="basis-full sm:ml-auto sm:basis-auto">
          Scripture: King James Version (public domain)
        </span>
      </div>
    </footer>
  );
}
