import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/siteConfig';

/** Footer carrying the links a public site is expected to have. */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gilt-600/15 px-4 py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-parchment-400">
        <span>
          © {new Date().getFullYear()} {SITE_NAME}
        </span>
        <span aria-hidden="true">·</span>
        <Link to="/legal/privacy" className="hover:text-gilt-400">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/terms" className="hover:text-gilt-400">
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <span>Scripture: King James Version (public domain)</span>
      </div>
    </footer>
  );
}
